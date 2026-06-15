package com.ataberk.cryptoalarm.service;

/** Kayitta secilen kullanici adi zaten varsa firlatilir (-> HTTP 409). */
public class UsernameTakenException extends RuntimeException {

    public UsernameTakenException(String username) {
        super("Kullanici adi zaten alinmis: " + username);
    }
}
