package com.ataberk.cryptoalarm;

import org.junit.jupiter.api.Test;

/**
 * Tum Spring context'inin (gercek PostgreSQL + Flyway gocleri + Hibernate validate dahil)
 * sorunsuz ayaga kalktigini dogrular. Testcontainers sayesinde harici DB gerekmez.
 */
class CryptoalarmApplicationTests extends AbstractIntegrationTest {

    @Test
    void contextLoads() {
    }
}
