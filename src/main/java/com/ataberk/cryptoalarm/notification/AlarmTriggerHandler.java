package com.ataberk.cryptoalarm.notification;

import com.ataberk.cryptoalarm.domain.Alarm;

import java.math.BigDecimal;

/**
 * Tetiklenen bir alarmin dis dunyaya bildirilmesi + DB'de kapatilmasi sorumlulugunu
 * soyutlar. Rule Engine bu arayuzu cagirir ama islemin nasil/nerede yapildigini bilmez
 * (gevsek baglilik). Bolum 4'te asenkron NotificationService bunu implemente edecek.
 */
public interface AlarmTriggerHandler {

    void onTriggered(Alarm alarm, BigDecimal triggerPrice);
}
