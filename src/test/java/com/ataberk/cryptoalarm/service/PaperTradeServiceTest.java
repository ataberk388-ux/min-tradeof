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
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Paper trading para mantigi birim testleri: bakiye, ortalama maliyet, yetersiz
 * bakiye/pozisyon kurallari. Repo'lar ve Binance fiyat istemcisi mock'lanir.
 */
@ExtendWith(MockitoExtension.class)
class PaperTradeServiceTest {

    @Mock
    private PaperAccountRepository accountRepo;
    @Mock
    private PaperPositionRepository positionRepo;
    @Mock
    private PaperOrderRepository orderRepo;
    @Mock
    private BinancePriceClient priceClient;
    /** Gercek (in-memory) registry: sayac artirimi NPE atmasin diye mock yerine spy. */
    @Spy
    private MeterRegistry meterRegistry = new SimpleMeterRegistry();

    @InjectMocks
    private PaperTradeService service;

    private static final Long USER = 1L;
    private PaperAccount account;

    @BeforeEach
    void setUp() {
        account = new PaperAccount(USER, new BigDecimal("10000"));
        lenient().when(accountRepo.findById(USER)).thenReturn(Optional.of(account));
        lenient().when(orderRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private static PaperOrderRequest req(OrderSide side, OrderType type, String price, String qty) {
        return new PaperOrderRequest("BTCUSDT", side, type,
                price == null ? null : new BigDecimal(price), new BigDecimal(qty));
    }

    @Test
    void marketBuy_reducesBalanceAndOpensPosition() {
        when(priceClient.currentPrice("BTCUSDT")).thenReturn(new BigDecimal("100"));
        when(positionRepo.findByUserIdAndAsset(USER, "BTC")).thenReturn(Optional.empty());

        PaperOrder order = service.place(req(OrderSide.BUY, OrderType.MARKET, null, "2"), USER);

        assertEquals(OrderStatus.FILLED, order.getStatus());
        // 10000 - 2*100 = 9800
        assertEquals(0, account.getUsdtBalance().compareTo(new BigDecimal("9800")));

        ArgumentCaptor<PaperPosition> captor = ArgumentCaptor.forClass(PaperPosition.class);
        verify(positionRepo).save(captor.capture());
        assertEquals("BTC", captor.getValue().getAsset());
        assertEquals(0, captor.getValue().getQty().compareTo(new BigDecimal("2")));
        assertEquals(0, captor.getValue().getAvgPrice().compareTo(new BigDecimal("100")));
    }

    @Test
    void marketBuy_twice_averagesCost() {
        PaperPosition pos = new PaperPosition(USER, "BTC", new BigDecimal("2"), new BigDecimal("100"));
        when(positionRepo.findByUserIdAndAsset(USER, "BTC")).thenReturn(Optional.of(pos));
        when(priceClient.currentPrice("BTCUSDT")).thenReturn(new BigDecimal("200"));

        service.place(req(OrderSide.BUY, OrderType.MARKET, null, "2"), USER);

        // qty 4, avg (2*100 + 2*200)/4 = 150
        assertEquals(0, pos.getQty().compareTo(new BigDecimal("4")));
        assertEquals(0, pos.getAvgPrice().compareTo(new BigDecimal("150")));
        // 10000 - 2*200 = 9600
        assertEquals(0, account.getUsdtBalance().compareTo(new BigDecimal("9600")));
    }

    @Test
    void marketSell_increasesBalanceAndReducesPosition() {
        PaperPosition pos = new PaperPosition(USER, "BTC", new BigDecimal("5"), new BigDecimal("100"));
        when(positionRepo.findByUserIdAndAsset(USER, "BTC")).thenReturn(Optional.of(pos));
        when(priceClient.currentPrice("BTCUSDT")).thenReturn(new BigDecimal("120"));

        service.place(req(OrderSide.SELL, OrderType.MARKET, null, "2"), USER);

        // 10000 + 2*120 = 10240
        assertEquals(0, account.getUsdtBalance().compareTo(new BigDecimal("10240")));
        assertEquals(0, pos.getQty().compareTo(new BigDecimal("3")));
    }

    @Test
    void buy_insufficientBalance_throws() {
        when(priceClient.currentPrice("BTCUSDT")).thenReturn(new BigDecimal("100"));
        // 200 * 100 = 20000 > 10000
        assertThrows(PaperTradeException.class,
                () -> service.place(req(OrderSide.BUY, OrderType.MARKET, null, "200"), USER));
        assertEquals(0, account.getUsdtBalance().compareTo(new BigDecimal("10000")));
    }

    @Test
    void sell_withoutPosition_throws() {
        when(priceClient.currentPrice("BTCUSDT")).thenReturn(new BigDecimal("100"));
        when(positionRepo.findByUserIdAndAsset(USER, "BTC")).thenReturn(Optional.empty());

        assertThrows(PaperTradeException.class,
                () -> service.place(req(OrderSide.SELL, OrderType.MARKET, null, "1"), USER));
    }

    @Test
    void limitOrder_restsOpen_withoutTouchingBalance() {
        PaperOrder order = service.place(req(OrderSide.BUY, OrderType.LIMIT, "90", "1"), USER);

        assertEquals(OrderStatus.OPEN, order.getStatus());
        assertEquals(0, account.getUsdtBalance().compareTo(new BigDecimal("10000")));
        verify(priceClient, never()).currentPrice(any());
    }
}
