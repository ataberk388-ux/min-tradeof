package com.ataberk.cryptoalarm.service;

import com.ataberk.cryptoalarm.domain.OrderSide;
import com.ataberk.cryptoalarm.domain.OrderStatus;
import com.ataberk.cryptoalarm.domain.OrderType;
import com.ataberk.cryptoalarm.domain.PaperAccount;
import com.ataberk.cryptoalarm.domain.PaperOrder;
import com.ataberk.cryptoalarm.domain.PaperPosition;
import com.ataberk.cryptoalarm.dto.PaperOrderRequest;
import com.ataberk.cryptoalarm.ingestion.BinancePriceClient;
import com.ataberk.cryptoalarm.repository.PaperAccountRepository;
import com.ataberk.cryptoalarm.repository.PaperOrderRepository;
import com.ataberk.cryptoalarm.repository.PaperPositionRepository;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;

/**
 * Paper (sanal) trading motoru. Gercek emir yok; sanal USDT bakiyesiyle simulasyon.
 * MARKET emir aninda dolar (fiyat Binance REST'ten sunucuda cekilir); LIMIT acik bekler,
 * fiyat hedefe ulasinca frontend fill cagrisi yapar.
 */
@Service
@RequiredArgsConstructor
public class PaperTradeService {

    private static final BigDecimal STARTING_BALANCE = new BigDecimal("10000");

    private final PaperAccountRepository accountRepo;
    private final PaperPositionRepository positionRepo;
    private final PaperOrderRepository orderRepo;
    private final BinancePriceClient priceClient;
    private final MeterRegistry meterRegistry;

    @Transactional
    public PaperAccount account(Long userId) {
        return accountRepo.findById(userId)
                .orElseGet(() -> accountRepo.save(new PaperAccount(userId, STARTING_BALANCE)));
    }

    @Transactional(readOnly = true)
    public List<PaperPosition> positions(Long userId) {
        return positionRepo.findByUserId(userId);
    }

    @Transactional(readOnly = true)
    public List<PaperOrder> orders(Long userId) {
        return orderRepo.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public PaperOrder place(PaperOrderRequest request, Long userId) {
        String symbol = request.symbol().trim().toUpperCase();
        if (!symbol.endsWith("USDT")) {
            throw new PaperTradeException("Sadece USDT çiftleri desteklenir");
        }
        String asset = symbol.substring(0, symbol.length() - 4);

        PaperOrder order = new PaperOrder();
        order.setUserId(userId);
        order.setSymbol(symbol);
        order.setSide(request.side());
        order.setType(request.type());
        order.setQty(request.qty());

        if (request.type() == OrderType.MARKET) {
            BigDecimal price = priceClient.currentPrice(symbol);
            applyFill(userId, asset, request.side(), request.qty(), price);
            order.setStatus(OrderStatus.FILLED);
            order.setPrice(price);
            order.setFillPrice(price);
            order.setFilledAt(Instant.now());
        } else {
            if (request.price() == null || request.price().signum() <= 0) {
                throw new PaperTradeException("LIMIT emir için geçerli fiyat gerekli");
            }
            order.setStatus(OrderStatus.OPEN);
            order.setPrice(request.price());
        }
        meterRegistry.counter("paper.order.placed", "type", request.type().name(), "side", request.side().name())
                .increment();
        return orderRepo.save(order);
    }

    /**
     * Sunucu-tarafi emir eslestirici (PaperOrderMatcher) icin: anlik piyasa fiyati limit
     * cizgisini gecmisse emri limit fiyatindan SUNUCUDA doldurur. Boylece dolum, istemci
     * (sekme acik mi) durumundan bagimsiz, otoritesi sunucuda olur.
     *
     * <p>Yetersiz bakiye/pozisyon gibi doldurulamaz durumda emir iptal edilir (sonsuz tekrar
     * denemeyi onler). Tek transaction icinde calisir; applyFill degisiklik yapmadan once
     * dogrulama yaptigi icin yakalanan istisnada kismi mutasyon olmaz.
     */
    @Transactional
    public void matchAndFill(Long orderId, BigDecimal marketPrice) {
        PaperOrder order = orderRepo.findById(orderId).orElse(null);
        if (order == null
                || order.getStatus() != OrderStatus.OPEN
                || order.getType() != OrderType.LIMIT
                || order.getPrice() == null) {
            return;
        }
        boolean crossed = order.getSide() == OrderSide.BUY
                ? marketPrice.compareTo(order.getPrice()) <= 0
                : marketPrice.compareTo(order.getPrice()) >= 0;
        if (!crossed) {
            return;
        }
        String asset = order.getSymbol().substring(0, order.getSymbol().length() - 4);
        BigDecimal price = order.getPrice();
        try {
            applyFill(order.getUserId(), asset, order.getSide(), order.getQty(), price);
            order.setStatus(OrderStatus.FILLED);
            order.setFillPrice(price);
            order.setFilledAt(Instant.now());
        } catch (PaperTradeException e) {
            order.setStatus(OrderStatus.CANCELLED);
        }
    }

    /** Acik bir LIMIT emrini limit fiyatindan gerceklestirir (fiyat hedefe ulasinca cagrilir). */
    @Transactional
    public PaperOrder fill(Long orderId, Long userId) {
        PaperOrder order = ownedOpenOrder(orderId, userId);
        String asset = order.getSymbol().substring(0, order.getSymbol().length() - 4);
        BigDecimal price = order.getPrice();
        applyFill(userId, asset, order.getSide(), order.getQty(), price);
        order.setStatus(OrderStatus.FILLED);
        order.setFillPrice(price);
        order.setFilledAt(Instant.now());
        return order;
    }

    @Transactional
    public void cancel(Long orderId, Long userId) {
        ownedOpenOrder(orderId, userId).setStatus(OrderStatus.CANCELLED);
    }

    @Transactional
    public void reset(Long userId) {
        orderRepo.deleteByUserId(userId);
        positionRepo.deleteByUserId(userId);
        account(userId).setUsdtBalance(STARTING_BALANCE);
    }

    private PaperOrder ownedOpenOrder(Long orderId, Long userId) {
        PaperOrder order = orderRepo.findById(orderId)
                .filter(o -> o.getUserId().equals(userId))
                .orElseThrow(() -> new PaperTradeException("Emir bulunamadı"));
        if (order.getStatus() != OrderStatus.OPEN) {
            throw new PaperTradeException("Emir zaten kapalı");
        }
        return order;
    }

    private void applyFill(Long userId, String asset, OrderSide side, BigDecimal qty, BigDecimal price) {
        PaperAccount account = account(userId);
        BigDecimal notional = qty.multiply(price);

        if (side == OrderSide.BUY) {
            if (account.getUsdtBalance().compareTo(notional) < 0) {
                throw new PaperTradeException("Yetersiz bakiye");
            }
            account.setUsdtBalance(account.getUsdtBalance().subtract(notional));
            PaperPosition pos = positionRepo.findByUserIdAndAsset(userId, asset).orElse(null);
            if (pos == null) {
                positionRepo.save(new PaperPosition(userId, asset, qty, price));
            } else {
                BigDecimal newQty = pos.getQty().add(qty);
                BigDecimal newAvg = pos.getQty().multiply(pos.getAvgPrice()).add(notional)
                        .divide(newQty, 8, RoundingMode.HALF_UP);
                pos.setQty(newQty);
                pos.setAvgPrice(newAvg);
            }
        } else {
            PaperPosition pos = positionRepo.findByUserIdAndAsset(userId, asset)
                    .orElseThrow(() -> new PaperTradeException("Pozisyon yok: " + asset));
            if (pos.getQty().compareTo(qty) < 0) {
                throw new PaperTradeException("Yetersiz pozisyon");
            }
            account.setUsdtBalance(account.getUsdtBalance().add(notional));
            BigDecimal remaining = pos.getQty().subtract(qty);
            if (remaining.signum() == 0) {
                positionRepo.delete(pos);
            } else {
                pos.setQty(remaining);
            }
        }
    }
}
