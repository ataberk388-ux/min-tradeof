package com.ataberk.cryptoalarm.notification;

import com.ataberk.cryptoalarm.domain.Alarm;
import com.ataberk.cryptoalarm.dto.AlarmTriggeredEvent;
import com.ataberk.cryptoalarm.repository.AlarmRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Tetiklenen alarmin dis dunyaya bildirildigi ve DB'de kapatildigi katman.
 * Rule Engine'in hizini kesmemek icin tamamen asenkron calisir: motor eslesmeyi
 * bulur bulmaz isi {@code notificationExecutor} havuzuna firlatir ve devam eder.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService implements AlarmTriggerHandler {

    private final AlarmRepository alarmRepository;
    private final AlarmEventPublisher eventPublisher;

    @Override
    @Async("notificationExecutor")
    @Transactional
    public void onTriggered(Alarm alarm, BigDecimal triggerPrice) {
        notifyExternal(alarm, triggerPrice);
        alarmRepository.deactivate(alarm.getId(), Instant.now());
        // Canli akis: yalnizca alarmin sahibine aninda it.
        eventPublisher.publishTriggered(alarm.getUserId(), AlarmTriggeredEvent.of(alarm, triggerPrice));
    }

    /**
     * Action boundary: ucu acik. Simdilik sadece log basar; ileride Telegram Bot API'sine
     * HTTP POST, mail tetikleme vb. buraya eklenebilir.
     */
    private void notifyExternal(Alarm alarm, BigDecimal triggerPrice) {
        log.info("🔔 ALARM #{}: {} {} {} -> tetiklendi (anlik fiyat={})",
                alarm.getId(), alarm.getSymbol(), alarm.getDirection(),
                alarm.getTargetPrice(), triggerPrice);
    }
}
