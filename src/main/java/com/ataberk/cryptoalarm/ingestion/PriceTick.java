package com.ataberk.cryptoalarm.ingestion;

import java.math.BigDecimal;

/**
 * Borsadan gelen tek bir anlik veri. {@code @trade} akisindan gelirse sadece son fiyat
 * tasinir ({@code changePercent} null); {@code @ticker} akisindan gelirse 24 saatlik
 * yuzde degisim de ({@code changePercent}) dolu gelir.
 */
public record PriceTick(String symbol, BigDecimal price, Double changePercent) {

    /** Yuzde degisim olmadan (orn. @trade tick'i veya testler). */
    public PriceTick(String symbol, BigDecimal price) {
        this(symbol, price, null);
    }
}

