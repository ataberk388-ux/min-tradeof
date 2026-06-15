package com.ataberk.cryptoalarm.dto;

import jakarta.validation.constraints.NotBlank;

/** Giris istegi. */
public record LoginRequest(

        @NotBlank(message = "kullanici adi bos olamaz")
        String username,

        @NotBlank(message = "sifre bos olamaz")
        String password
) {
}
