package com.ataberk.cryptoalarm.repository;

import com.ataberk.cryptoalarm.domain.OrderStatus;
import com.ataberk.cryptoalarm.domain.OrderType;
import com.ataberk.cryptoalarm.domain.PaperOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaperOrderRepository extends JpaRepository<PaperOrder, Long> {

    List<PaperOrder> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<PaperOrder> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, OrderStatus status);

    /** Sunucu-tarafi emir eslestiricinin taradigi acik LIMIT emirleri. */
    List<PaperOrder> findByStatusAndType(OrderStatus status, OrderType type);

    void deleteByUserId(Long userId);
}
