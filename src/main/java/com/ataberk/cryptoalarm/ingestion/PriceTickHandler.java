package com.ataberk.cryptoalarm.ingestion;

/**
 * Ingestion katmaninin uretip ilettigi fiyat tick'lerini tuketen soyutlama.
 * Bolum 3'te Rule Engine bu arayuzu implemente edecek; boylece ingestion,
 * isleme katmanindan gevsek bagli (loose-coupled) kalir.
 */
public interface PriceTickHandler {

    void handle(PriceTick tick);
}
