package com.ataberk.cryptoalarm.domain;

/**
 * Bir alarmin hangi yonde tetiklenecegini belirtir.
 *
 * <ul>
 *   <li>{@link #ABOVE} - fiyat hedefe ulasinca veya gecince (currentPrice &gt;= target)</li>
 *   <li>{@link #BELOW} - fiyat hedefe inince veya altina gecince (currentPrice &lt;= target)</li>
 * </ul>
 */
public enum AlarmDirection {
    ABOVE,
    BELOW
}
