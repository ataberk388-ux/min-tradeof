package com.ataberk.cryptoalarm.api;

import java.util.Map;

/**
 * Tum hata cevaplari icin tek tip govde.
 *
 * @param code   makine-okur hata kodu (orn. VALIDATION_ERROR)
 * @param message insan-okur aciklama
 * @param fields  alan bazli dogrulama hatalari (yoksa bos)
 */
public record ApiError(String code, String message, Map<String, String> fields) {
}
