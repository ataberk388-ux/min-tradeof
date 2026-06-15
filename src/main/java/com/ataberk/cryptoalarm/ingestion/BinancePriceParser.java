package com.ataberk.cryptoalarm.ingestion;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * Binance akis mesajlarini {@link PriceTick}'e cevirir. Iki akis turunu ayirir:
 *
 * <ul>
 *   <li><b>@trade</b> ({@code "e":"trade"}): {@code "p"} = islem fiyati. Yuksek frekansli;
 *       motorun esleştirme yaptigi akis.</li>
 *   <li><b>@ticker</b> ({@code "e":"24hrTicker"}): {@code "c"} = son fiyat, {@code "P"} =
 *       24s yuzde degisim. ~saniyede 1; markets tablosu icin.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class BinancePriceParser {

    private final ObjectMapper objectMapper;

    public Optional<PriceTick> parse(String message) {
        try {
            JsonNode node = objectMapper.readTree(message);
            JsonNode eventType = node.get("e");
            JsonNode symbol = node.get("s");
            if (eventType == null || symbol == null) {
                return Optional.empty();
            }
            return switch (eventType.asText()) {
                case "trade" -> {
                    JsonNode price = node.get("p");
                    yield price == null
                            ? Optional.empty()
                            : Optional.of(new PriceTick(symbol.asText(), new BigDecimal(price.asText()), null));
                }
                case "24hrTicker" -> {
                    JsonNode last = node.get("c");
                    JsonNode pct = node.get("P");
                    yield last == null
                            ? Optional.empty()
                            : Optional.of(new PriceTick(
                                    symbol.asText(),
                                    new BigDecimal(last.asText()),
                                    pct == null ? null : Double.valueOf(pct.asText())));
                }
                default -> Optional.empty();
            };
        } catch (Exception e) {
            // Bozuk/beklenmeyen mesaj akisi durdurmaz, sadece atlanir.
            return Optional.empty();
        }
    }
}
