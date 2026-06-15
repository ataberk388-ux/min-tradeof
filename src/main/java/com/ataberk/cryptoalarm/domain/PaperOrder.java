package com.ataberk.cryptoalarm.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

/** Paper (sanal) emir. MARKET aninda dolar; LIMIT acik bekler, fiyat cizgiyi gecince dolar. */
@Entity
@Table(name = "paper_orders")
@Getter
@Setter
@NoArgsConstructor
public class PaperOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String symbol;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderSide side;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderType type;

    /** LIMIT icin hedef fiyat; MARKET icin null. */
    @Column(precision = 38, scale = 8)
    private BigDecimal price;

    @Column(nullable = false, precision = 38, scale = 8)
    private BigDecimal qty;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    /** Gerceklesince dolan fiyat. */
    @Column(name = "fill_price", precision = 38, scale = 8)
    private BigDecimal fillPrice;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "filled_at")
    private Instant filledAt;
}
