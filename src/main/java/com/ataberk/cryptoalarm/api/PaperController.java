package com.ataberk.cryptoalarm.api;

import com.ataberk.cryptoalarm.dto.PaperOrderRequest;
import com.ataberk.cryptoalarm.dto.PaperResponses;
import com.ataberk.cryptoalarm.service.PaperTradeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Paper (sanal) trading uclari: portfoy, emirler, emir verme/doldurma/iptal, sifirlama. */
@RestController
@RequestMapping("/api/paper")
@RequiredArgsConstructor
public class PaperController {

    private final PaperTradeService paperTradeService;

    @GetMapping("/portfolio")
    public PaperResponses.Portfolio portfolio(@AuthenticationPrincipal Jwt jwt) {
        Long userId = userId(jwt);
        List<PaperResponses.Position> positions = paperTradeService.positions(userId).stream()
                .map(PaperResponses.Position::from)
                .toList();
        return new PaperResponses.Portfolio(
                paperTradeService.account(userId).getUsdtBalance(), positions);
    }

    @GetMapping("/orders")
    public List<PaperResponses.Order> orders(@AuthenticationPrincipal Jwt jwt) {
        return paperTradeService.orders(userId(jwt)).stream()
                .map(PaperResponses.Order::from)
                .toList();
    }

    @PostMapping("/orders")
    @ResponseStatus(HttpStatus.CREATED)
    public PaperResponses.Order place(@Valid @RequestBody PaperOrderRequest request,
                                      @AuthenticationPrincipal Jwt jwt) {
        return PaperResponses.Order.from(paperTradeService.place(request, userId(jwt)));
    }

    @PostMapping("/orders/{id}/fill")
    public PaperResponses.Order fill(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return PaperResponses.Order.from(paperTradeService.fill(id, userId(jwt)));
    }

    @DeleteMapping("/orders/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        paperTradeService.cancel(id, userId(jwt));
    }

    @PostMapping("/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reset(@AuthenticationPrincipal Jwt jwt) {
        paperTradeService.reset(userId(jwt));
    }

    private static Long userId(Jwt jwt) {
        return ((Number) jwt.getClaim("userId")).longValue();
    }
}
