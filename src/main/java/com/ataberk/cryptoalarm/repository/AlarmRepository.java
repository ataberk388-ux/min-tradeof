package com.ataberk.cryptoalarm.repository;

import com.ataberk.cryptoalarm.domain.Alarm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface AlarmRepository extends JpaRepository<Alarm, Long> {

    /** Uygulama acilisinda RAM cache'ini doldurmak icin kullanilir (TUM kullanicilar). */
    List<Alarm> findByActiveTrue();

    /** Bir kullanicinin aktif alarmlari, kullanici siralamasina gore (null'lar sona). */
    @Query("select a from Alarm a where a.userId = :userId and a.active = true "
            + "order by a.sortOrder asc nulls last, a.id asc")
    List<Alarm> findActiveByUserOrdered(@Param("userId") Long userId);

    /** Bir kullanicinin tetiklenmis (gecmis) alarmlari, en yeni once. */
    List<Alarm> findByUserIdAndActiveFalseOrderByTriggeredAtDesc(Long userId);

    long countByUserIdAndActiveTrue(Long userId);

    long countByUserIdAndActiveFalse(Long userId);

    /**
     * Tetiklenen alarmi DB'de kapatir. Detached entity'yi save etmek yerine tek
     * sorguda gunceller; tetiklenme aninda yapilacak en hizli/temiz yazma yolu.
     */
    @Modifying
    @Query("update Alarm a set a.active = false, a.triggeredAt = :triggeredAt where a.id = :id")
    void deactivate(@Param("id") Long id, @Param("triggeredAt") Instant triggeredAt);
}
