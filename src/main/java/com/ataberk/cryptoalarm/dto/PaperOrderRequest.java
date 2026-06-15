package com.ataberk.cryptoalarm.dto;

import com.ataberk.cryptoalarm.domain.OrderSide;
import com.ataberk.cryptoalarm.domain.OrderType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

/** Paper emir verme istegi. LIMIT icin price zorunlu; MARKET icin yok sayilir. */
public record PaperOrderRequest(

        @NotBlank(message = "symbol bos olamaz")
        String symbol,

        @NotNull(message = "side zorunlu (BUY/SELL)")
        OrderSide side,

        @NotNull(message = "type zorunlu (MARKET/LIMIT)")
        OrderType type,

        BigDecimal price,

        @NotNull(message = "qty zorunlu")
        @Positive(message = "qty pozitif olmali")
        BigDecimal qty
) {
}
