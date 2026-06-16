package com.ataberk.cryptoalarm.dto;

import com.ataberk.cryptoalarm.domain.AlarmDirection;
import com.ataberk.cryptoalarm.domain.AlarmType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

/**
 * Alarm olusturma istegi. Entity dogrudan API'ye acilmaz; gelen veri burada dogrulanir.
 * {@code type} verilmezse PRICE varsayilir; PERCENT'te targetPrice yuzde buyuklugudur.
 */
public record CreateAlarmRequest(

        @NotBlank(message = "symbol bos olamaz")
        String symbol,

        @NotNull(message = "targetPrice zorunlu")
        @Positive(message = "targetPrice pozitif olmali")
        BigDecimal targetPrice,

        @NotNull(message = "direction zorunlu (ABOVE veya BELOW)")
        AlarmDirection direction,

        AlarmType type
) {
}
