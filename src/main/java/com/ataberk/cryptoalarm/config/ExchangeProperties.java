package com.ataberk.cryptoalarm.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

/**
 * application.yml icindeki "exchange.*" ayarlarini tasir. Borsa adresi ve takip
 * edilecek semboller koda gomulmek yerine buradan okunur.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "exchange")
public class ExchangeProperties {

    /** Borsanin WebSocket adresi (orn. Binance wss:// endpoint'i). */
    private String wsUrl;

    /** Takip edilecek islem ciftleri (kanonik ust-harf, orn. BTCUSDT). */
    private List<String> symbols = new ArrayList<>();
}
