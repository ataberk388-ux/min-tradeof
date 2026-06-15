package com.ataberk.cryptoalarm.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Bildirim/DB-yazma islerini Rule Engine'in hot path'inden ayiran asenkron yapilandirma.
 * Kucuk, sinirli bir platform thread havuzu kullanilir: dis API'leri (Telegram/mail)
 * korur ve burst aninda kuyruk uzerinden backpressure saglar.
 *
 * <p>{@code @EnableScheduling}: canli fiyat yayini (PricePublisher) periyodik calisir.
 */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {

    @Bean("notificationExecutor")
    public Executor notificationExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("notify-");
        executor.initialize();
        return executor;
    }
}
