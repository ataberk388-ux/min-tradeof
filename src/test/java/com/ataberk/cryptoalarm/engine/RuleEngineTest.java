package com.ataberk.cryptoalarm.engine;

import com.ataberk.cryptoalarm.cache.AlarmStore;
import com.ataberk.cryptoalarm.cache.InMemoryAlarmStore;
import com.ataberk.cryptoalarm.domain.Alarm;
import com.ataberk.cryptoalarm.domain.AlarmDirection;
import com.ataberk.cryptoalarm.ingestion.PriceTick;
import com.ataberk.cryptoalarm.notification.AlarmTriggerHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Sistemin kalbi olan eslestirme mantigini Spring baslatmadan, saf birim testiyle dogrular.
 */
class RuleEngineTest {

    private AlarmStore cache;
    private CapturingTriggerHandler triggerHandler;
    private RuleEngine ruleEngine;

    @BeforeEach
    void setUp() {
        cache = new InMemoryAlarmStore();
        triggerHandler = new CapturingTriggerHandler();
        ruleEngine = new RuleEngine(cache, triggerHandler);
    }

    @Test
    void above_alarm_fires_when_price_reaches_target() {
        cache.add(alarm("BTCUSDT", "60000", AlarmDirection.ABOVE));

        ruleEngine.handle(tick("BTCUSDT", "60000"));

        assertThat(triggerHandler.triggered).hasSize(1);
        assertThat(cache.getBySymbol("BTCUSDT")).isEmpty(); // eviction
    }

    @Test
    void above_alarm_does_not_fire_below_target() {
        cache.add(alarm("BTCUSDT", "60000", AlarmDirection.ABOVE));

        ruleEngine.handle(tick("BTCUSDT", "59999.99"));

        assertThat(triggerHandler.triggered).isEmpty();
        assertThat(cache.getBySymbol("BTCUSDT")).hasSize(1);
    }

    @Test
    void below_alarm_fires_when_price_drops_to_target() {
        cache.add(alarm("ETHUSDT", "3000", AlarmDirection.BELOW));

        ruleEngine.handle(tick("ETHUSDT", "2999.5"));

        assertThat(triggerHandler.triggered).hasSize(1);
    }

    @Test
    void unknown_symbol_is_ignored() {
        cache.add(alarm("BTCUSDT", "60000", AlarmDirection.ABOVE));

        ruleEngine.handle(tick("DOGEUSDT", "1"));

        assertThat(triggerHandler.triggered).isEmpty();
    }

    @Test
    void alarm_fires_exactly_once_even_with_two_ticks() {
        cache.add(alarm("BTCUSDT", "60000", AlarmDirection.ABOVE));

        ruleEngine.handle(tick("BTCUSDT", "60001"));
        ruleEngine.handle(tick("BTCUSDT", "60002")); // alarm artik cache'te yok

        assertThat(triggerHandler.triggered).hasSize(1);
    }

    private static final java.util.concurrent.atomic.AtomicLong ID_SEQ =
            new java.util.concurrent.atomic.AtomicLong(1);

    private static Alarm alarm(String symbol, String target, AlarmDirection direction) {
        Alarm alarm = new Alarm(symbol, new BigDecimal(target), direction);
        alarm.setId(ID_SEQ.getAndIncrement()); // gercekte alarmlar DB'den id'li gelir
        return alarm;
    }

    private static PriceTick tick(String symbol, String price) {
        return new PriceTick(symbol, new BigDecimal(price));
    }

    /** Tetiklenen alarmlari toplayan basit test cift'i (test double). */
    private static class CapturingTriggerHandler implements AlarmTriggerHandler {
        final List<Alarm> triggered = new ArrayList<>();

        @Override
        public void onTriggered(Alarm alarm, BigDecimal triggerPrice) {
            triggered.add(alarm);
        }
    }
}
