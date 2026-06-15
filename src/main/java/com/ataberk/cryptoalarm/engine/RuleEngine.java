package com.ataberk.cryptoalarm.engine;

import com.ataberk.cryptoalarm.cache.AlarmStore;
import com.ataberk.cryptoalarm.domain.Alarm;
import com.ataberk.cryptoalarm.ingestion.PriceTick;
import com.ataberk.cryptoalarm.ingestion.PriceTickHandler;
import com.ataberk.cryptoalarm.notification.AlarmTriggerHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

/**
 * Sistemin en yuksek throughput'a sahip noktasi: gelen her fiyat tick'i ile RAM'deki
 * alarmlari carpistirir.
 *
 * <ol>
 *   <li><b>Lookup:</b> sembolun alarm listesi cache'ten O(1) cekilir.</li>
 *   <li><b>Evaluation:</b> liste uzerinde gezilip {@code currentPrice} hedefe gore kontrol edilir.</li>
 *   <li><b>Guard:</b> {@code tryClaimTrigger()} ile alarm atomik olarak "kapanir"; es zamanli
 *       iki tick gelse bile tam olarak bir kez tetiklenir.</li>
 *   <li><b>Eviction:</b> tetiklenen alarm cache'ten aninda cikarilir (CopyOnWriteArrayList
 *       sayesinde iterasyon sirasinda guvenli).</li>
 *   <li><b>Hand-off:</b> eylem {@link AlarmTriggerHandler}'a paslanir; motor beklemeden
 *       fiyatlari islemeye devam eder.</li>
 * </ol>
 */
@Component
@RequiredArgsConstructor
public class RuleEngine implements PriceTickHandler {

    private final AlarmStore alarmStore;
    private final AlarmTriggerHandler triggerHandler;

    @Override
    public void handle(PriceTick tick) {
        List<Alarm> alarms = alarmStore.getBySymbol(tick.symbol());
        if (alarms.isEmpty()) {
            return;
        }
        BigDecimal price = tick.price();
        for (Alarm alarm : alarms) {
            if (alarm.isTriggeredBy(price) && alarm.tryClaimTrigger()) {
                alarmStore.remove(alarm);
                triggerHandler.onTriggered(alarm, price);
            }
        }
    }
}
