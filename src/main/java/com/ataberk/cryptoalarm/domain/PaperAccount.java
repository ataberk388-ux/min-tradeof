package com.ataberk.cryptoalarm.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/** Kullanicinin paper (sanal) hesabi. Tek USDT bakiyesi; pozisyonlar ayri tabloda. */
@Entity
@Table(name = "paper_accounts")
@Getter
@Setter
@NoArgsConstructor
public class PaperAccount {

    /** = kullanici id'si (kullanici basina tek hesap). */
    @Id
    private Long userId;

    @Column(name = "usdt_balance", nullable = false, precision = 38, scale = 8)
    private BigDecimal usdtBalance;

    public PaperAccount(Long userId, BigDecimal usdtBalance) {
        this.userId = userId;
        this.usdtBalance = usdtBalance;
    }
}
