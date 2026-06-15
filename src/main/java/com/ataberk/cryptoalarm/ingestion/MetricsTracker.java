package com.ataberk.cryptoalarm.ingestion;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicLong;

/**
 * Motorun throughput'unu olcer: gelen her tick'i sayar ve saniyede islenen tick
 * sayisini (ticks/sn) hesaplar. {@link PriceTickHandler} oldugu icin her tick'te
 * cagrilir; sadece bir atomik artirma yapar (ihmal edilebilir maliyet).
 */
@Component
public class MetricsTracker implements PriceTickHandler {

    private final AtomicLong totalTicks = new AtomicLong();
    private volatile long lastSampleTotal = 0;
    private volatile long ticksPerSecond = 0;

    @Override
    public void handle(PriceTick tick) {
        totalTicks.incrementAndGet();
    }

    /** Saniyede bir, son saniyedeki tick farkini hesaplar. */
    @Scheduled(fixedRate = 1000)
    public void sample() {
        long current = totalTicks.get();
        ticksPerSecond = current - lastSampleTotal;
        lastSampleTotal = current;
    }

    public long getTotalTicks() {
        return totalTicks.get();
    }

    public long getTicksPerSecond() {
        return ticksPerSecond;
    }
}
