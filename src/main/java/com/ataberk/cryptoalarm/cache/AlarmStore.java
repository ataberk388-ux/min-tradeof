package com.ataberk.cryptoalarm.cache;

import com.ataberk.cryptoalarm.domain.Alarm;

import java.util.List;

/**
 * Aktif alarmlarin tutuldugu deponun soyutlamasi. Bugun tek-node RAM implementasyonu
 * ({@link InMemoryAlarmStore}) kullaniliyor; yarin dagitik olmak gerekirse (Redis,
 * sembol-partition vb.) sadece bu arayuzun yeni bir implementasyonu yazilir, engine
 * ve servis katmani hic degismez.
 */
public interface AlarmStore {

    void add(Alarm alarm);

    List<Alarm> getBySymbol(String symbol);

    void remove(Alarm alarm);

    int activeCount();
}
