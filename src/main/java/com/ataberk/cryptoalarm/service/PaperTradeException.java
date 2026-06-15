package com.ataberk.cryptoalarm.service;

/** Paper trading kural ihlali (yetersiz bakiye/pozisyon, gecersiz emir vb.) -> HTTP 400. */
public class PaperTradeException extends RuntimeException {

    public PaperTradeException(String message) {
        super(message);
    }
}
