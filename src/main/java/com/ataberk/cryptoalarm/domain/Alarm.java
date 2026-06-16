package com.ataberk.cryptoalarm.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Bir fiyat alarmi. Hem PostgreSQL'de kalici olarak tutulur, hem de aktifken
 * RAM'deki cache'te (bkz. AlarmCache) yasar.
 */
@Entity
@Table(name = "alarms")
@Getter
@Setter
@NoArgsConstructor
public class Alarm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Alarmin sahibi olan kullanicinin id'si. Motor bunu umursamaz; sahiplik
     *  filtresi (REST) ve kullanici-bazli SSE yonlendirmesi icin tasinir. */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Islem cifti, kanonik ust-harf formatta tutulur (orn. BTCUSDT). */
    @Column(nullable = false)
    private String symbol;

    /** Hedef fiyat. Hassasiyet kaybi olmamasi icin BigDecimal. */
    @Column(name = "target_price", nullable = false, precision = 38, scale = 18)
    private BigDecimal targetPrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlarmDirection direction;

    /** Alarm turu. Eski kayitlarda null gelebilir; mantikta null = PRICE kabul edilir. */
    @Enumerated(EnumType.STRING)
    @Column(name = "type")
    private AlarmType type = AlarmType.PRICE;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    /** Kullanicinin listedeki siralamasi (surukle-birak). null ise en sona dizilir. */
    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "triggered_at")
    private Instant triggeredAt;

    /**
     * Yalnizca runtime guard'i - kalici DEGIL. Ayni alarm icin neredeyse es zamanli
     * iki fiyat tick'i gelirse, alarmin tam olarak bir kez tetiklenmesini saglar.
     */
    @Transient
    private final AtomicBoolean firing = new AtomicBoolean(false);

    public Alarm(String symbol, BigDecimal targetPrice, AlarmDirection direction) {
        this.symbol = symbol;
        this.targetPrice = targetPrice;
        this.direction = direction;
    }

    /**
     * Tetikleme hakkini atomik olarak "kapar". Sadece ilk cagiran {@code true} alir;
     * es zamanli sonraki cagiranlar {@code false} alir ve tetiklemeyi tekrarlamaz.
     */
    public boolean tryClaimTrigger() {
        return firing.compareAndSet(false, true);
    }

    /**
     * Geriye donuk uyumluluk: yalniz fiyatla degerlendirir (PRICE turu, testler).
     */
    public boolean isTriggeredBy(BigDecimal currentPrice) {
        return switch (direction) {
            case ABOVE -> currentPrice.compareTo(targetPrice) >= 0;
            case BELOW -> currentPrice.compareTo(targetPrice) <= 0;
        };
    }

    /**
     * Gelen tick (son fiyat + 24s yuzde degisim) bu alarmi tetikler mi?
     * PRICE turu fiyatla; PERCENT turu yuzde degisimle karsilastirir. PERCENT alarmlari
     * yalniz @ticker tick'lerinde ({@code changePercent != null}) degerlendirilebilir.
     */
    public boolean isTriggeredBy(BigDecimal currentPrice, Double changePercent) {
        AlarmType t = (type == null) ? AlarmType.PRICE : type;
        if (t == AlarmType.PERCENT) {
            if (changePercent == null) {
                return false;
            }
            double threshold = targetPrice.doubleValue();
            return switch (direction) {
                case ABOVE -> changePercent >= threshold;
                case BELOW -> changePercent <= -threshold;
            };
        }
        return isTriggeredBy(currentPrice);
    }
}
