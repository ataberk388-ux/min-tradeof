package com.ataberk.cryptoalarm.dto;

import com.ataberk.cryptoalarm.domain.Alarm;
import com.ataberk.cryptoalarm.domain.AlarmDirection;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Bir alarm tetiklendiginde SSE uzerinden frontend'e itilen olay govdesi.
 * {@link AlarmResponse}'tan farki: anlik tetikleme fiyatini ({@code triggerPrice})
 * da tasir, boylece UI "60000 hedefine 60012'de ulasildi" gibi gosterebilir.
 */
public record AlarmTriggeredEvent(
        Long id,
        String symbol,
        BigDecimal targetPrice,
        AlarmDirection direction,
        BigDecimal triggerPrice,
        Instant triggeredAt
) {
    public static AlarmTriggeredEvent of(Alarm alarm, BigDecimal triggerPrice) {
        return new AlarmTriggeredEvent(
                alarm.getId(),
                alarm.getSymbol(),
                alarm.getTargetPrice(),
                alarm.getDirection(),
                triggerPrice,
                Instant.now());
    }
}
