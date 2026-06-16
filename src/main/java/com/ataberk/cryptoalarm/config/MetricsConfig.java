package com.ataberk.cryptoalarm.config;

import com.ataberk.cryptoalarm.cache.AlarmStore;
import com.ataberk.cryptoalarm.ingestion.BinanceWebSocketClient;
import com.ataberk.cryptoalarm.ingestion.MetricsTracker;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.binder.MeterBinder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Uygulamaya ozel Micrometer metrikleri. Prometheus/Grafana'nin cekebilmesi icin
 * motorun ic durumunu gauge olarak yayinlar (/actuator/prometheus).
 *
 * <ul>
 *   <li>{@code alarm.engine.ticks_per_second} - motorun anlik throughput'u</li>
 *   <li>{@code alarm.engine.ticks_total} - islenen toplam tick</li>
 *   <li>{@code alarm.active} - RAM cache'indeki aktif alarm sayisi</li>
 *   <li>{@code exchange.ws.connected} - borsa baglantisi acik mi (1/0)</li>
 * </ul>
 *
 * <p>Sayaclar (alarm.triggered, paper.order.placed) ilgili servislerde MeterRegistry
 * uzerinden artirilir.
 */
@Configuration
public class MetricsConfig {

    @Bean
    MeterBinder engineMetrics(MetricsTracker tracker, BinanceWebSocketClient webSocketClient, AlarmStore alarmStore) {
        return registry -> {
            Gauge.builder("alarm.engine.ticks_per_second", tracker, MetricsTracker::getTicksPerSecond)
                    .description("Motorun saniyede isledigi tick sayisi")
                    .register(registry);
            Gauge.builder("alarm.engine.ticks_total", tracker, MetricsTracker::getTotalTicks)
                    .description("Islenen toplam tick")
                    .register(registry);
            Gauge.builder("alarm.active", alarmStore, AlarmStore::activeCount)
                    .description("RAM cache'indeki aktif alarm sayisi")
                    .register(registry);
            Gauge.builder("exchange.ws.connected", webSocketClient, w -> w.isConnected() ? 1d : 0d)
                    .description("Borsa WebSocket baglantisi acik mi (1/0)")
                    .register(registry);
        };
    }
}
