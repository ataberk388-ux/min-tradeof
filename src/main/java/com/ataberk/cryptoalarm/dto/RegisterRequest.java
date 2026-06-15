package com.ataberk.cryptoalarm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Kayit istegi. Kurallar frontend Zod semasinda da aynalanir. */
public record RegisterRequest(

        @NotBlank(message = "kullanici adi bos olamaz")
        @Size(min = 3, max = 30, message = "kullanici adi 3-30 karakter olmali")
        String username,

        @NotBlank(message = "sifre bos olamaz")
        @Size(min = 6, max = 72, message = "sifre 6-72 karakter olmali")
        String password
) {
}
