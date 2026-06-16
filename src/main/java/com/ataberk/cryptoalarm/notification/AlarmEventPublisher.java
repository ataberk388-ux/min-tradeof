package com.ataberk.cryptoalarm.notification;

import com.ataberk.cryptoalarm.dto.AlarmTriggeredEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Tetiklenen alarmlari, alarmin SAHIBI olan kullanicinin acik frontend baglantilarina
 * SSE (Server-Sent Events) uzerinden canli olarak iter. Akis tek yonlu (server -> client)
 * oldugu icin WebSocket yerine SSE secildi: daha az kod, tarayicida hazir {@code EventSource}
 * + otomatik reconnect.
 *
 * <p>Baglantilar kullanici bazinda tutulur ({@code userId -> emitter listesi}); boylece
 * kullanici A'nin alarmi kullanici B'ye sizmaz. {@link ConcurrentHashMap} +
 * {@link CopyOnWriteArrayList}: yayin ile abone ekleme/cikarma farkli thread'lerden gelebilir,
 * yapi iterasyon sirasinda guvenli mutasyona izin verir (engine'in sicak yolu ile ayni felsefe).
 */
@Slf4j
@Component
public class AlarmEventPublisher {

    /** Baglanti omru; bu sureden sonra istemci kendiliginden yeniden baglanir. */
    private static final long TIMEOUT_MS = 30 * 60 * 1000L;

    private final Map<Long, CopyOnWriteArrayList<SseEmitter>> emittersByUser = new ConcurrentHashMap<>();

    /** Bir kullanici akisa abone olur. Baglanti kapaninca emitter listeden cikarilir. */
    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = new SseEmitter(TIMEOUT_MS);
        emittersByUser.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);
        emitter.onCompletion(() -> removeEmitter(userId, emitter));
        // Timeout'ta emitter'i nazikce tamamla: aksi halde Spring AsyncRequestTimeoutException
        // firlatip WARN basar. complete() ile baglanti sessizce kapanir, istemci reconnect eder.
        emitter.onTimeout(() -> {
            emitter.complete();
            removeEmitter(userId, emitter);
        });
        emitter.onError(e -> removeEmitter(userId, emitter));
        return emitter;
    }

    /** Tetiklenen alarmi yalnizca sahibinin acik baglantilarina yayinlar. Olu baglantilar atilir. */
    public void publishTriggered(Long userId, AlarmTriggeredEvent event) {
        List<SseEmitter> emitters = emittersByUser.get(userId);
        if (emitters == null) {
            return;
        }
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("alarm-triggered").data(event));
            } catch (IOException | IllegalStateException e) {
                // Istemci gitmis: baglantiyi kapat, onCompletion/onError listeden cikarir.
                emitter.complete();
            }
        }
    }

    private void removeEmitter(Long userId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> emitters = emittersByUser.get(userId);
        if (emitters != null) {
            emitters.remove(emitter);
        }
    }
}
