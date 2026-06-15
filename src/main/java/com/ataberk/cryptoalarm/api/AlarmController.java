package com.ataberk.cryptoalarm.api;

import com.ataberk.cryptoalarm.dto.AlarmResponse;
import com.ataberk.cryptoalarm.dto.CreateAlarmRequest;
import com.ataberk.cryptoalarm.notification.AlarmEventPublisher;
import com.ataberk.cryptoalarm.service.AlarmService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/alarms")
@RequiredArgsConstructor
public class AlarmController {

    private final AlarmService alarmService;
    private final AlarmEventPublisher eventPublisher;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AlarmResponse create(@Valid @RequestBody CreateAlarmRequest request,
                                @AuthenticationPrincipal Jwt jwt) {
        return AlarmResponse.from(alarmService.create(request, userId(jwt)));
    }

    @GetMapping
    public List<AlarmResponse> listActive(@AuthenticationPrincipal Jwt jwt) {
        return alarmService.listActive(userId(jwt)).stream()
                .map(AlarmResponse::from)
                .toList();
    }

    @GetMapping("/history")
    public List<AlarmResponse> history(@AuthenticationPrincipal Jwt jwt) {
        return alarmService.listHistory(userId(jwt)).stream()
                .map(AlarmResponse::from)
                .toList();
    }

    /** Alarm kartlarinin yeni sirasi (surukle-birak): govde, id'lerin istenen sirasi. */
    @PutMapping("/reorder")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reorder(@RequestBody List<Long> orderedIds, @AuthenticationPrincipal Jwt jwt) {
        alarmService.reorder(orderedIds, userId(jwt));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        alarmService.delete(id, userId(jwt));
    }

    /**
     * Canli tetikleme akisi: istemci buraya abone olur ve KENDI alarmlarindan biri
     * tetiklendiginde "alarm-triggered" olayini aninda alir. Tek yonlu akis -> SSE.
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@AuthenticationPrincipal Jwt jwt) {
        return eventPublisher.subscribe(userId(jwt));
    }

    /** JWT'deki userId claim'ini Long'a cevirir (Nimbus sayilari Long/Integer dondurebilir). */
    private static Long userId(Jwt jwt) {
        return ((Number) jwt.getClaim("userId")).longValue();
    }
}
