package com.ataberk.cryptoalarm.ingestion;

import com.ataberk.cryptoalarm.dto.PriceQuote;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Her sembolun EN SON kotasyonunu (fiyat + 24s degisim) RAM'de tutar. @trade tick'i
 * sadece fiyati gunceller, son bilinen degisim yuzdesini korur; @ticker tick'i ikisini
 * de tazeler. Frontend'e canli fiyat gostermek icin
 * {@link com.ataberk.cryptoalarm.notification.PricePublisher} bu snapshot'i periyodik yayinlar.
 */
@Component
public class PriceCache implements PriceTickHandler {

    private final Map<String, PriceQuote> latestBySymbol = new ConcurrentHashMap<>();

    @Override
    public void handle(PriceTick tick) {
        latestBySymbol.merge(
                tick.symbol(),
                new PriceQuote(tick.price(), tick.changePercent()),
                (oldQuote, incoming) -> new PriceQuote(
                        incoming.price(),
                        incoming.changePercent() != null ? incoming.changePercent() : oldQuote.changePercent()));
    }

    /** O anki tum kotasyonlarin anlik kopyasi (sembol -> {price, changePercent}). */
    public Map<String, PriceQuote> snapshot() {
        return Map.copyOf(latestBySymbol);
    }
}
