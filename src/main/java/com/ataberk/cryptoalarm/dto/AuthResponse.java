package com.ataberk.cryptoalarm.dto;

/** Basarili kayit/giris sonrasi donen JWT + kullanici adi. */
public record AuthResponse(String token, String username) {
}
