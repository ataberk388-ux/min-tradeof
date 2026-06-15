package com.ataberk.cryptoalarm.api;

import com.ataberk.cryptoalarm.dto.StatsResponse;
import com.ataberk.cryptoalarm.ingestion.BinanceWebSocketClient;
import com.ataberk.cryptoalarm.ingestion.MetricsTracker;
import com.ataberk.cryptoalarm.service.AlarmService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Dashboard istatistikleri: motor throughput'u + kullaniciya ozel alarm sayilari. */
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

    private final MetricsTracker metrics;
    private final BinanceWebSocketClient webSocketClient;
    private final AlarmService alarmService;

    @GetMapping
    public StatsResponse stats(@AuthenticationPrincipal Jwt jwt) {
        Long userId = ((Number) jwt.getClaim("userId")).longValue();
        return new StatsResponse(
                metrics.getTicksPerSecond(),
                metrics.getTotalTicks(),
                alarmService.countActive(userId),
                alarmService.countTriggered(userId),
                webSocketClient.isConnected());
    }
}
