package com.ataberk.cryptoalarm.api;

import com.ataberk.cryptoalarm.notification.PricePublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** Canli fiyat akisi. Fiyatlar kullaniciya ozel degil ama yine de kimlik dogrulamasi ister. */
@RestController
@RequestMapping("/api/prices")
@RequiredArgsConstructor
public class PriceController {

    private final PricePublisher pricePublisher;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        return pricePublisher.subscribe();
    }
}
