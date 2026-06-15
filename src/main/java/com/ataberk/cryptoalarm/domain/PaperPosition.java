package com.ataberk.cryptoalarm.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/** Bir varlikta (orn. BTC) acik pozisyon: miktar + ortalama maliyet. */
@Entity
@Table(name = "paper_positions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "asset"}))
@Getter
@Setter
@NoArgsConstructor
public class PaperPosition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Varlik kodu (orn. BTC, ETH) — sembolun USDT'siz hali. */
    @Column(nullable = false)
    private String asset;

    @Column(nullable = false, precision = 38, scale = 8)
    private BigDecimal qty;

    @Column(name = "avg_price", nullable = false, precision = 38, scale = 8)
    private BigDecimal avgPrice;

    public PaperPosition(Long userId, String asset, BigDecimal qty, BigDecimal avgPrice) {
        this.userId = userId;
        this.asset = asset;
        this.qty = qty;
        this.avgPrice = avgPrice;
    }
}
