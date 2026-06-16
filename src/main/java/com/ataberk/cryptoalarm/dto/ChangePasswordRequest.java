package com.ataberk.cryptoalarm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Sifre degistirme istegi. Mevcut sifre dogrulanir, yeni sifre kayit kurallariyla ayni
 * (6-72 karakter) sinirlara tabidir.
 */
public record ChangePasswordRequest(

        @NotBlank(message = "mevcut sifre zorunlu")
        String currentPassword,

        @NotBlank(message = "yeni sifre zorunlu")
        @Size(min = 6, max = 72, message = "yeni sifre 6-72 karakter olmali")
        String newPassword
) {
}
