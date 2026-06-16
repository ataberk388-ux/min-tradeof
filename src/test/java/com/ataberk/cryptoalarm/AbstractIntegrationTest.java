package com.ataberk.cryptoalarm;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Entegrasyon testleri icin temel sinif. Testcontainers ile efemer (gercek) bir PostgreSQL
 * ayaga kalkar; {@code @ServiceConnection} datasource'u otomatik bu konteynere baglar.
 * Boylece testler harici DB gerektirmeden, CI dahil her yerde calisir ve Flyway gocleri
 * gercek bir Postgres'te kosturulup dogrulanir.
 */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
public abstract class AbstractIntegrationTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine");
}
