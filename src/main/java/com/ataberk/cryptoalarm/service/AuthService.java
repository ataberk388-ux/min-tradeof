package com.ataberk.cryptoalarm.service;

import com.ataberk.cryptoalarm.domain.User;
import com.ataberk.cryptoalarm.dto.AuthResponse;
import com.ataberk.cryptoalarm.dto.ChangePasswordRequest;
import com.ataberk.cryptoalarm.dto.LoginRequest;
import com.ataberk.cryptoalarm.dto.RegisterRequest;
import com.ataberk.cryptoalarm.repository.UserRepository;
import com.ataberk.cryptoalarm.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Kayit ve giris is mantigi. Sifre BCrypt ile hash'lenir; basarili her islemde
 * cagirana stateless bir JWT doner.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new UsernameTakenException(request.username());
        }
        User user = new User(request.username(), passwordEncoder.encode(request.password()));
        userRepository.save(user);
        return new AuthResponse(jwtService.issue(user), user.getUsername());
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.username())
                .orElseThrow(InvalidCredentialsException::new);
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        return new AuthResponse(jwtService.issue(user), user.getUsername());
    }

    /** Oturum acmis kullanicinin sifresini degistirir: mevcut sifre dogrulanir, yeni hash yazilir. */
    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId).orElseThrow(InvalidCredentialsException::new);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    }
}
