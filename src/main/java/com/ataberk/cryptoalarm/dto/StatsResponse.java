package com.ataberk.cryptoalarm.dto;

/**
 * Dashboard istatistik karti icin ozet. Motor metrikleri (ticksPerSecond, totalTicks,
 * wsConnected) global; alarm sayilari (activeAlarms, totalTriggered) o kullaniciya ozel.
 */
public record StatsResponse(
        long ticksPerSecond,
        long totalTicks,
        long activeAlarms,
        long totalTriggered,
        boolean wsConnected
) {
}
