package com.ataberk.cryptoalarm.repository;

import com.ataberk.cryptoalarm.domain.PaperPosition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaperPositionRepository extends JpaRepository<PaperPosition, Long> {

    List<PaperPosition> findByUserId(Long userId);

    Optional<PaperPosition> findByUserIdAndAsset(Long userId, String asset);

    void deleteByUserId(Long userId);
}
