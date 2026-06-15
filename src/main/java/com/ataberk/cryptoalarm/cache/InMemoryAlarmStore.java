package com.ataberk.cryptoalarm.cache;

import com.ataberk.cryptoalarm.domain.Alarm;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Sistemin kalbi: tum aktif alarmlar sembol bazinda RAM'de tutulur ({@link AlarmStore}'un
 * tek-node, in-memory implementasyonu).
 *
 * <p>Key = islem cifti (orn. BTCUSDT), value = o sembole ait alarm listesi.
 * Saniyede onlarca fiyat tick'i okurken ayni anda alarm ekleme/silme istekleri
 * gelebilecegi icin yapi tamamen thread-safe'tir:
 * <ul>
 *   <li>{@link ConcurrentHashMap} - sembol bazinda eszamanli erisim,</li>
 *   <li>{@link CopyOnWriteArrayList} - okuma agirlikli liste; iterasyon sirasinda
 *       ConcurrentModificationException riski yoktur.</li>
 * </ul>
 */
@Component
public class InMemoryAlarmStore implements AlarmStore {

    private final Map<String, CopyOnWriteArrayList<Alarm>> alarmsBySymbol = new ConcurrentHashMap<>();

    @Override
    public void add(Alarm alarm) {
        alarmsBySymbol
                .computeIfAbsent(alarm.getSymbol(), key -> new CopyOnWriteArrayList<>())
                .add(alarm);
    }

    @Override
    public List<Alarm> getBySymbol(String symbol) {
        List<Alarm> list = alarmsBySymbol.get(symbol);
        return list != null ? list : List.of();
    }

    /**
     * Esitlik id uzerinden yapilir; boylece DB'den ayri bir instance olarak okunmus
     * alarm da dogru silinir (entity'de equals/hashCode override etmeye gerek kalmaz).
     */
    @Override
    public void remove(Alarm alarm) {
        CopyOnWriteArrayList<Alarm> list = alarmsBySymbol.get(alarm.getSymbol());
        if (list != null && alarm.getId() != null) {
            list.removeIf(a -> alarm.getId().equals(a.getId()));
        }
    }

    @Override
    public int activeCount() {
        return alarmsBySymbol.values().stream().mapToInt(List::size).sum();
    }
}
