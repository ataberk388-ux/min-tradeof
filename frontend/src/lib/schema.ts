import { z } from 'zod'

/** Backend'deki AlarmDirection ile birebir ayni. */
export const alarmDirections = ['ABOVE', 'BELOW'] as const
export type AlarmDirection = (typeof alarmDirections)[number]

/** Backend'deki AlarmType ile birebir ayni. PRICE = fiyat, PERCENT = 24s yuzde degisim. */
export const alarmTypes = ['PRICE', 'PERCENT'] as const
export type AlarmType = (typeof alarmTypes)[number]

/**
 * Form dogrulama semasi. Backend'deki @Valid kurallarini frontend'de aynalar:
 * sembol bos olamaz, hedef deger pozitif, yon zorunlu. PERCENT'te hedef = yuzde buyuklugu.
 */
export const createAlarmSchema = z.object({
  symbol: z.string().trim().min(1, 'Sembol zorunlu'),
  targetPrice: z
    .string()
    .min(1, 'Hedef değer zorunlu')
    .refine((value) => Number(value) > 0, 'Değer pozitif olmalı'),
  direction: z.enum(alarmDirections),
  type: z.enum(alarmTypes),
})

export type CreateAlarmInput = z.infer<typeof createAlarmSchema>

/** Giris semasi. */
export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Kullanıcı adı zorunlu'),
  password: z.string().min(1, 'Şifre zorunlu'),
})
export type LoginInput = z.infer<typeof loginSchema>

/** Kayıt şeması — backend @Valid kurallarını aynalar (3-30 / 6-72). */
export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Kullanıcı adı en az 3 karakter')
    .max(30, 'Kullanıcı adı en fazla 30 karakter'),
  password: z
    .string()
    .min(6, 'Şifre en az 6 karakter')
    .max(72, 'Şifre en fazla 72 karakter'),
})
export type RegisterInput = z.infer<typeof registerSchema>
