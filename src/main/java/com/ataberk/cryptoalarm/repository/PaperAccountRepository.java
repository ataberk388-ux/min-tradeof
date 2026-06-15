package com.ataberk.cryptoalarm.repository;

import com.ataberk.cryptoalarm.domain.PaperAccount;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaperAccountRepository extends JpaRepository<PaperAccount, Long> {
}
