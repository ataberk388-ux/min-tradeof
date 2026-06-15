package com.ataberk.cryptoalarm.dto;

import com.ataberk.cryptoalarm.domain.Alarm;
import com.ataberk.cryptoalarm.domain.AlarmDirection;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Alarm'in disariya donen temsili. Entity'yi dogrudan serialize etmemek icin ayri tutulur.
 */
public record AlarmResponse(
        Long id,
        String symbol,
        BigDecimal targetPrice,
        AlarmDirection direction,
        boolean active,
        Instant createdAt,
        Instant triggeredAt
) {
    public static AlarmResponse from(Alarm alarm) {
        return new AlarmResponse(
                alarm.getId(),
                alarm.getSymbol(),
                alarm.getTargetPrice(),
                alarm.getDirection(),
                alarm.isActive(),
                alarm.getCreatedAt(),
                alarm.getTriggeredAt());
    }
}
