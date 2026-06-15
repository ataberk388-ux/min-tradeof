import { z } from 'zod'

/** Backend'deki AlarmDirection ile birebir ayni. */
export const alarmDirections = ['ABOVE', 'BELOW'] as const
export type AlarmDirection = (typeof alarmDirections)[number]

/**
 * Form dogrulama semasi. Backend'deki @Valid kurallarini frontend'de aynalar:
 * sembol bos olamaz, fiyat pozitif, yon zorunlu.
 */
export const createAlarmSchema = z.object({
  symbol: z.string().trim().min(1, 'Sembol zorunlu'),
  targetPrice: z
    .string()
    .min(1, 'Hedef fiyat zorunlu')
    .refine((value) => Number(value) > 0, 'Fiyat pozitif olmali'),
  direction: z.enum(alarmDirections),
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
