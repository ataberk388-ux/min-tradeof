package com.ataberk.cryptoalarm.domain;

/**
 * Bir alarmin neyi izledigini belirtir.
 *
 * <ul>
 *   <li>{@link #PRICE} - son fiyat hedefe gore (currentPrice, targetPrice ile karsilastirilir).</li>
 *   <li>{@link #PERCENT} - 24 saatlik yuzde degisim esige gore (targetPrice = yuzde buyuklugu;
 *       ABOVE -> +esik ustu, BELOW -> -esik alti). @ticker akisindan beslenir.</li>
 * </ul>
 */
public enum AlarmType {
    PRICE,
    PERCENT
}
