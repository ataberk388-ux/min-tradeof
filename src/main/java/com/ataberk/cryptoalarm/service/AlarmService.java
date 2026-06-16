package com.ataberk.cryptoalarm.service;

import com.ataberk.cryptoalarm.cache.AlarmStore;
import com.ataberk.cryptoalarm.domain.Alarm;
import com.ataberk.cryptoalarm.dto.CreateAlarmRequest;
import com.ataberk.cryptoalarm.repository.AlarmRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Alarm yasam dongusunu yonetir ve iki kaynagi tutarli tutar:
 * kalici DB (PostgreSQL) ve RAM cache (AlarmCache).
 */
@Service
@RequiredArgsConstructor
public class AlarmService {

    private final AlarmRepository alarmRepository;
    private final AlarmStore alarmStore;

    /** Yeni alarm olusturur: DB'ye yazar, ardindan RAM cache'ine ekler. Sahibi {@code userId}. */
    @Transactional
    public Alarm create(CreateAlarmRequest request, Long userId) {
        Alarm alarm = new Alarm(
                normalizeSymbol(request.symbol()),
                request.targetPrice(),
                request.direction());
        alarm.setUserId(userId);
        // Yeni alarm listenin sonuna dussun
        alarm.setSortOrder((int) alarmRepository.countByUserIdAndActiveTrue(userId));
        Alarm saved = alarmRepository.save(alarm);
        alarmStore.add(saved);
        return saved;
    }

    /** Bir kullanicinin aktif alarmlarini, kullanici siralamasiyla listeler. */
    @Transactional(readOnly = true)
    public List<Alarm> listActive(Long userId) {
        return alarmRepository.findActiveByUserOrdered(userId);
    }

    /**
     * Aktif bir alarmin hedef fiyat/yonunu gunceller. Sembol degismez.
     * RAM cache'i tutarli tutmak icin cikar-guncelle-ekle yapilir.
     */
    @Transactional
    public Alarm update(Long id, CreateAlarmRequest request, Long userId) {
        Alarm alarm = alarmRepository.findById(id)
                .filter(a -> a.getUserId().equals(userId) && a.isActive())
                .orElseThrow(() -> new AlarmNotFoundException(id));
        alarmStore.remove(alarm);
        alarm.setTargetPrice(request.targetPrice());
        alarm.setDirection(request.direction());
        Alarm saved = alarmRepository.save(alarm);
        alarmStore.add(saved);
        return saved;
    }

    /** Bir kullanicinin tetiklenmis (gecmis) alarmlari, en yeni once. */
    @Transactional(readOnly = true)
    public List<Alarm> listHistory(Long userId) {
        return alarmRepository.findByUserIdAndActiveFalseOrderByTriggeredAtDesc(userId);
    }

    public long countActive(Long userId) {
        return alarmRepository.countByUserIdAndActiveTrue(userId);
    }

    public long countTriggered(Long userId) {
        return alarmRepository.countByUserIdAndActiveFalse(userId);
    }

    /**
     * Alarmlari verilen id sirasina gore yeniden siralar (yalniz sahibininkiler).
     * Yonetilen entity'ler @Transactional icinde dirty-checking ile guncellenir.
     */
    @Transactional
    public void reorder(List<Long> orderedIds, Long userId) {
        Map<Long, Alarm> byId = alarmRepository.findAllById(orderedIds).stream()
                .collect(Collectors.toMap(Alarm::getId, Function.identity()));
        for (int i = 0; i < orderedIds.size(); i++) {
            Alarm alarm = byId.get(orderedIds.get(i));
            if (alarm != null && alarm.getUserId().equals(userId)) {
                alarm.setSortOrder(i);
            }
        }
    }

    /**
     * Alarmi iptal eder: DB'de pasiflestirir ve RAM cache'inden cikarir.
     * Sadece sahibi silebilir; baskasinin alarmi "bulunamadi" gibi davranir (varligini sizdirmaz).
     */
    @Transactional
    public void delete(Long id, Long userId) {
        Alarm alarm = alarmRepository.findById(id)
                .filter(a -> a.getUserId().equals(userId))
                .orElseThrow(() -> new AlarmNotFoundException(id));
        alarm.setActive(false);
        alarmRepository.save(alarm);
        alarmStore.remove(alarm);
    }

    /** Sembolu kanonik forma (ust-harf) cevirir; cache anahtarlari bununla eslesir. */
    private String normalizeSymbol(String symbol) {
        return symbol.trim().toUpperCase();
    }
}
