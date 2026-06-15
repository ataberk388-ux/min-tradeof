package com.ataberk.cryptoalarm.dto;

import java.math.BigDecimal;

/**
 * Bir sembolun frontend'e gonderilen anlik kotasyonu: son fiyat + 24s yuzde degisim.
 * changePercent, @ticker akisindan gelene kadar null olabilir.
 */
public record PriceQuote(BigDecimal price, Double changePercent) {
}
