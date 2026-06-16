package com.ataberk.cryptoalarm.cache;

import com.ataberk.cryptoalarm.domain.Alarm;
import com.ataberk.cryptoalarm.ingestion.BinanceWebSocketClient;
import com.ataberk.cryptoalarm.repository.AlarmRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Uygulama tam olarak ayaga kalktiginda (ApplicationReadyEvent) DB'deki tum aktif
 * alarmlari bir kez okuyup {@link AlarmStore}'a yukler. Bu noktadan sonra okuma yuku
 * tamamen bellekten karsilanir, DB'ye okuma yapilmaz.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AlarmStoreLoader {

    private final AlarmRepository alarmRepository;
    private final AlarmStore alarmStore;
    private final BinanceWebSocketClient webSocketClient;

    @EventListener(ApplicationReadyEvent.class)
    public void loadActiveAlarms() {
        List<Alarm> active = alarmRepository.findByActiveTrue();
        active.forEach(alarmStore::add);
        // Mevcut alarmlarin sembollerine de canli abone ol (config disindakiler dahil).
        active.stream().map(Alarm::getSymbol).distinct().forEach(webSocketClient::ensureSubscribed);
        log.info("Alarm store yuklendi: {} aktif alarm", active.size());
    }
}
