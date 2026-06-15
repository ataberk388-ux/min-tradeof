package com.ataberk.cryptoalarm.service;

/** Verilen id ile aktif/var olan bir alarm bulunamadiginda firlatilir (-> HTTP 404). */
public class AlarmNotFoundException extends RuntimeException {

    public AlarmNotFoundException(Long id) {
        super("Alarm bulunamadi: id=" + id);
    }
}
