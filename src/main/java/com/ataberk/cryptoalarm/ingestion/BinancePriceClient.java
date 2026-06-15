package com.ataberk.cryptoalarm.ingestion;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Paper market emirlerini gerçekleştirirken anlik fiyati Binance'in public REST'inden
 * SUNUCU tarafinda ceker. Boylece dolum fiyati istemciye guvenilmeden belirlenir.
 */
@Slf4j
@Component
public class BinancePriceClient {

    private final RestClient restClient = RestClient.create("https://api.binance.com");

    /** Sembolun anlik fiyati (orn. BTCUSDT -> 107432.10). */
    public BigDecimal currentPrice(String symbol) {
        @SuppressWarnings("unchecked")
        Map<String, Object> body = restClient.get()
                .uri("/api/v3/ticker/price?symbol={s}", symbol)
                .retrieve()
                .body(Map.class);
        if (body == null || body.get("price") == null) {
            throw new IllegalStateException("Binance fiyati alinamadi: " + symbol);
        }
        return new BigDecimal(String.valueOf(body.get("price")));
    }
}
