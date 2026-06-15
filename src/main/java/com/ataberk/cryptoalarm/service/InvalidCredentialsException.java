package com.ataberk.cryptoalarm.service;

/** Kullanici adi/sifre eslesmediginde firlatilir (-> HTTP 401). */
public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException() {
        super("Kullanici adi veya sifre hatali");
    }
}
