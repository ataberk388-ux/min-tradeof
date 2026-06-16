package com.ataberk.cryptoalarm.service;

import com.ataberk.cryptoalarm.domain.OrderStatus;
import com.ataberk.cryptoalarm.domain.OrderType;
import com.ataberk.cryptoalarm.domain.PaperOrder;
import com.ataberk.cryptoalarm.ingestion.BinancePriceClient;
import com.ataberk.cryptoalarm.repository.PaperOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Sunucu-tarafi LIMIT emir eslestirici. Periyodik olarak acik LIMIT emirleri tarar, her
 * sembolun anlik fiyatini Binance REST'ten ceker ve cizgisini gecen emirleri SUNUCUDA doldurur.
 *
 * <p>Bu, paper-trade'in dolum mantigini istemciden (sekme acik mi) bagimsiz kilar: emir,
 * uygulama kapali olsa bile fiyat hedefe ulasinca dolar — dolum otoritesi sunucudadir.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaperOrderMatcher {

    private final PaperOrderRepository orderRepo;
    private final PaperTradeService paperService;
    private final BinancePriceClient priceClient;

    @Scheduled(fixedDelayString = "${paper.matcher.interval-ms:3000}")
    public void matchOpenLimitOrders() {
        List<PaperOrder> open = orderRepo.findByStatusAndType(OrderStatus.OPEN, OrderType.LIMIT);
        if (open.isEmpty()) {
            return;
        }

        // Sembol basina tek fiyat cagrisi (ayni sembolde cok emir varsa tekrar cekmemek icin)
        Set<String> symbols = open.stream().map(PaperOrder::getSymbol).collect(Collectors.toSet());
        Map<String, BigDecimal> prices = new HashMap<>();
        for (String symbol : symbols) {
            try {
                prices.put(symbol, priceClient.currentPrice(symbol));
            } catch (Exception e) {
                log.debug("Eslestirici fiyat alamadi: {} ({})", symbol, e.getMessage());
            }
        }

        for (PaperOrder order : open) {
            BigDecimal price = prices.get(order.getSymbol());
            if (price == null) {
                continue;
            }
            try {
                paperService.matchAndFill(order.getId(), price);
            } catch (Exception e) {
                log.warn("Eslestirici dolum hatasi (emir {}): {}", order.getId(), e.getMessage());
            }
        }
    }
}
