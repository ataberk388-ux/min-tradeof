package com.ataberk.cryptoalarm.notification;

import com.ataberk.cryptoalarm.dto.PriceQuote;
import com.ataberk.cryptoalarm.ingestion.PriceCache;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Canli fiyatlari frontend'e SSE ile yayinlar. Tick'ler saniyede onlarca gelse de
 * frontend'i bogmamak icin saniyede BIR kez {@link PriceCache} snapshot'i itilir
 * (throttle). Fiyatlar kullaniciya ozel degil -> tek ortak yayin listesi.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PricePublisher {

    private static final long TIMEOUT_MS = 30 * 60 * 1000L;

    private final PriceCache priceCache;
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    /** Yeni istemci abone olur ve hemen mevcut fiyat snapshot'ini alir (UI aninda dolsun). */
    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(TIMEOUT_MS);
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(e -> emitters.remove(emitter));

        Map<String, PriceQuote> snapshot = priceCache.snapshot();
        if (!snapshot.isEmpty()) {
            try {
                emitter.send(SseEmitter.event().name("prices").data(snapshot));
            } catch (IOException e) {
                emitter.complete();
            }
        }
        return emitter;
    }

    @Scheduled(fixedRate = 1000)
    public void broadcast() {
        if (emitters.isEmpty()) {
            return;
        }
        Map<String, PriceQuote> snapshot = priceCache.snapshot();
        if (snapshot.isEmpty()) {
            return;
        }
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("prices").data(snapshot));
            } catch (IOException | IllegalStateException e) {
                emitter.complete();
            }
        }
    }
}
