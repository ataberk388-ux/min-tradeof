package com.ataberk.cryptoalarm.dto;

import com.ataberk.cryptoalarm.domain.Alarm;
import com.ataberk.cryptoalarm.domain.AlarmDirection;
import com.ataberk.cryptoalarm.domain.AlarmType;

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
        AlarmType type,
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
                alarm.getType() == null ? AlarmType.PRICE : alarm.getType(),
                alarm.isActive(),
                alarm.getCreatedAt(),
                alarm.getTriggeredAt());
    }
}
