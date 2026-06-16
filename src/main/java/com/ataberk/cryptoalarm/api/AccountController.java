package com.ataberk.cryptoalarm.api;

import com.ataberk.cryptoalarm.dto.ChangePasswordRequest;
import com.ataberk.cryptoalarm.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Oturum acmis kullaniciya ozel hesap islemleri. {@code /api/auth/**}'in aksine bu uclar
 * kimlik dogrulamasi ister (guvenlik config'inde anyRequest().authenticated()).
 */
@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
public class AccountController {

    private final AuthService authService;

    @PostMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@Valid @RequestBody ChangePasswordRequest request,
                               @AuthenticationPrincipal Jwt jwt) {
        authService.changePassword(userId(jwt), request);
    }

    private static Long userId(Jwt jwt) {
        return ((Number) jwt.getClaim("userId")).longValue();
    }
}
