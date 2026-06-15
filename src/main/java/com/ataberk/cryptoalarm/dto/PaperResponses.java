package com.ataberk.cryptoalarm.dto;

import com.ataberk.cryptoalarm.domain.OrderSide;
import com.ataberk.cryptoalarm.domain.OrderStatus;
import com.ataberk.cryptoalarm.domain.OrderType;
import com.ataberk.cryptoalarm.domain.PaperOrder;
import com.ataberk.cryptoalarm.domain.PaperPosition;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Paper trading disa donen temsilleri. */
public final class PaperResponses {

    private PaperResponses() {
    }

    public record Portfolio(BigDecimal usdtBalance, List<Position> positions) {
    }

    public record Position(String asset, BigDecimal qty, BigDecimal avgPrice) {
        public static Position from(PaperPosition p) {
            return new Position(p.getAsset(), p.getQty(), p.getAvgPrice());
        }
    }

    public record Order(
            Long id,
            String symbol,
            OrderSide side,
            OrderType type,
            BigDecimal price,
            BigDecimal qty,
            OrderStatus status,
            BigDecimal fillPrice,
            Instant createdAt,
            Instant filledAt
    ) {
        public static Order from(PaperOrder o) {
            return new Order(o.getId(), o.getSymbol(), o.getSide(), o.getType(), o.getPrice(),
                    o.getQty(), o.getStatus(), o.getFillPrice(), o.getCreatedAt(), o.getFilledAt());
        }
    }
}
