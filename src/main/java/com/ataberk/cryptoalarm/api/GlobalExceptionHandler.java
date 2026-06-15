package com.ataberk.cryptoalarm.api;

import com.ataberk.cryptoalarm.service.AlarmNotFoundException;
import com.ataberk.cryptoalarm.service.InvalidCredentialsException;
import com.ataberk.cryptoalarm.service.PaperTradeException;
import com.ataberk.cryptoalarm.service.UsernameTakenException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Tum controller'lar icin merkezi hata yonetimi. Stacktrace sizdirmadan,
 * istemciye duzgun ve tutarli JSON hata govdesi doner.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiError handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(error -> fields.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return new ApiError("VALIDATION_ERROR", "Gecersiz istek", fields);
    }

    @ExceptionHandler(AlarmNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiError handleNotFound(AlarmNotFoundException ex) {
        return new ApiError("NOT_FOUND", ex.getMessage(), Map.of());
    }

    @ExceptionHandler(UsernameTakenException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiError handleUsernameTaken(UsernameTakenException ex) {
        return new ApiError("USERNAME_TAKEN", ex.getMessage(), Map.of());
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ApiError handleInvalidCredentials(InvalidCredentialsException ex) {
        return new ApiError("INVALID_CREDENTIALS", ex.getMessage(), Map.of());
    }

    @ExceptionHandler(PaperTradeException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiError handlePaperTrade(PaperTradeException ex) {
        return new ApiError("PAPER_TRADE_ERROR", ex.getMessage(), Map.of());
    }
}
