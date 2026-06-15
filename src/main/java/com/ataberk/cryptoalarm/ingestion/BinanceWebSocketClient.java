package com.ataberk.cryptoalarm.ingestion;

import com.ataberk.cryptoalarm.config.ExchangeProperties;
import jakarta.annotation.PreDestroy;
import jakarta.websocket.ClientEndpointConfig;
import jakarta.websocket.CloseReason;
import jakarta.websocket.ContainerProvider;
import jakarta.websocket.Endpoint;
import jakarta.websocket.EndpointConfig;
import jakarta.websocket.Session;
import jakarta.websocket.WebSocketContainer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * Borsanin (Binance) WebSocket akisina kalici baglanti tutan ingestion istemcisi.
 *
 * <ul>
 *   <li>Uygulama hazir olunca (ApplicationReadyEvent) baglanir.</li>
 *   <li>Baglanti acilinca ilgili "@trade" stream'lerine abone olur.</li>
 *   <li>Kopma/hata durumunda ustel geri cekilme (exponential backoff) ile yeniden baglanir.</li>
 *   <li>Kapanista session'i nazikce kapatir (graceful shutdown).</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BinanceWebSocketClient {

    private static final long BASE_DELAY_MS = 1_000L;
    private static final long MAX_DELAY_MS = 30_000L;
    private static final int MAX_BACKOFF_SHIFT = 5; // 2^5 = 32x -> ~30sn'de tavanlanir

    private final ExchangeProperties properties;
    private final BinancePriceParser parser;
    /** Tum tick tuketicileri (Rule Engine + fiyat cache'i). Her tick hepsine paslanir. */
    private final List<PriceTickHandler> tickHandlers;

    private final ScheduledExecutorService reconnectScheduler =
            Executors.newSingleThreadScheduledExecutor(runnable -> {
                Thread thread = new Thread(runnable, "ws-reconnect");
                thread.setDaemon(true);
                return thread;
            });

    private final AtomicInteger reconnectAttempts = new AtomicInteger(0);
    private volatile Session session;
    private volatile boolean running = true;
    private volatile boolean connected = false;

    /** Borsa baglantisi su an acik mi (istatistik panelinde gosterilir). */
    public boolean isConnected() {
        return connected;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void start() {
        connect();
    }

    private void connect() {
        if (!running) {
            return;
        }
        try {
            WebSocketContainer container = ContainerProvider.getWebSocketContainer();
            container.connectToServer(
                    new ExchangeEndpoint(),
                    ClientEndpointConfig.Builder.create().build(),
                    URI.create(properties.getWsUrl()));
        } catch (Exception e) {
            log.warn("WebSocket baglantisi kurulamadi: {}", e.getMessage());
            scheduleReconnect();
        }
    }

    /** jakarta.websocket programatik istemci endpoint'i. */
    private class ExchangeEndpoint extends Endpoint {

        @Override
        public void onOpen(Session sess, EndpointConfig config) {
            session = sess;
            connected = true;
            reconnectAttempts.set(0);
            sess.addMessageHandler(String.class, BinanceWebSocketClient.this::onMessage);
            subscribe(sess);
            log.info("Borsa WebSocket baglantisi acildi: {}", properties.getWsUrl());
        }

        @Override
        public void onClose(Session sess, CloseReason reason) {
            connected = false;
            log.warn("WebSocket kapandi: {}", reason.getReasonPhrase());
            scheduleReconnect();
        }

        @Override
        public void onError(Session sess, Throwable thr) {
            log.error("WebSocket hatasi", thr);
            // Genelde ardindan onClose gelir; reconnect orada tetiklenir.
        }
    }

    private void onMessage(String message) {
        parser.parse(message).ifPresent(tick -> {
            for (PriceTickHandler handler : tickHandlers) {
                try {
                    handler.handle(tick);
                } catch (Exception e) {
                    // Bir tuketicinin hatasi digerlerini ve akisi durdurmasin.
                    log.warn("Tick handler hatasi ({}): {}",
                            handler.getClass().getSimpleName(), e.getMessage());
                }
            }
        });
    }

    private void subscribe(Session sess) {
        // Her sembol icin iki akis: @trade (yuksek frekans, motor) + @ticker (24s % degisim, markets)
        List<String> streams = properties.getSymbols().stream()
                .flatMap(symbol -> java.util.stream.Stream.of(
                        symbol.toLowerCase() + "@trade",
                        symbol.toLowerCase() + "@ticker"))
                .toList();
        String payload = "{\"method\":\"SUBSCRIBE\",\"params\":["
                + streams.stream().map(s -> "\"" + s + "\"").collect(Collectors.joining(","))
                + "],\"id\":1}";
        sess.getAsyncRemote().sendText(payload);
        log.info("Abone olunan stream'ler: {}", streams);
    }

    private void scheduleReconnect() {
        if (!running) {
            return;
        }
        int attempt = reconnectAttempts.incrementAndGet();
        long delay = Math.min(MAX_DELAY_MS,
                BASE_DELAY_MS * (1L << Math.min(attempt - 1, MAX_BACKOFF_SHIFT)));
        log.info("{} ms sonra yeniden baglanilacak (deneme {})", delay, attempt);
        reconnectScheduler.schedule(this::connect, delay, TimeUnit.MILLISECONDS);
    }

    @PreDestroy
    public void shutdown() {
        running = false;
        reconnectScheduler.shutdownNow();
        Session current = session;
        if (current != null && current.isOpen()) {
            try {
                current.close(new CloseReason(CloseReason.CloseCodes.NORMAL_CLOSURE, "uygulama kapaniyor"));
            } catch (Exception e) {
                log.debug("WebSocket kapatilirken hata: {}", e.getMessage());
            }
        }
        log.info("Borsa WebSocket istemcisi kapatildi");
    }
}
