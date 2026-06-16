import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Bell, Loader2, Lock, ShieldCheck, User, Zap } from 'lucide-react'
import {
  loginSchema,
  registerSchema,
  type RegisterInput,
} from '@/lib/schema'
import { loginUser, registerUser, type ApiError } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

type Mode = 'login' | 'register'

/** Yukari suzulen dekoratif kripto sembolleri (sol hero). */
const COINS = ['₿', 'Ξ', '◈', '₮', 'Ł', '✦', 'Ð', '₳']

/** Canli his veren mum grafigi cubuklari (yukseklik + animasyon gecikmesi). */
const BARS = [38, 62, 48, 80, 56, 72, 44, 90, 60, 76, 50, 84, 46, 68]

/**
 * Profesyonel split-screen giris ekrani: solda animasyonlu kripto hero (marka +
 * canli mum grafigi + ozellikler), sagda temiz login/kayit formu. Mobilde sol panel
 * gizlenir, form tam ekran olur. Token yokken tum uygulamanin onune gecer.
 */
export function AuthForm({ onBack }: { onBack?: () => void } = {}) {
  const [mode, setMode] = useState<Mode>('login')
  const isLogin = mode === 'login'

  return (
    <div className="fixed inset-0 flex">
      {onBack && (
        <button
          onClick={onBack}
          className="absolute left-4 top-4 z-20 rounded-md px-2 py-1 text-sm text-white/80 transition hover:text-white"
        >
          ← Geri
        </button>
      )}
      {/* ── SOL: animasyonlu kripto hero (lg+) ───────────────────────── */}
      <aside className="auth-bg relative hidden w-[55%] overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="auth-grid pointer-events-none absolute inset-0" />

        {COINS.map((coin, i) => (
          <span
            key={i}
            className="auth-coin"
            style={{
              left: `${(i * 12 + 5) % 92}%`,
              fontSize: `${22 + (i % 4) * 12}px`,
              animationDuration: `${14 + (i % 5) * 3}s`,
              animationDelay: `${i * 1.6}s`,
            }}
          >
            {coin}
          </span>
        ))}

        {/* Alt zemin: canli mum grafigi */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex h-44 items-end gap-2 px-12 opacity-50">
          {BARS.map((h, i) => (
            <div
              key={i}
              className="auth-bar"
              style={{ height: `${h}%`, animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </div>

        {/* Marka */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-bn-gold/15 ring-1 ring-bn-gold/30">
            <Bell className="h-6 w-6 text-bn-gold" />
          </div>
          <span className="text-lg font-semibold text-white">Crypto Alarm</span>
        </div>

        {/* Baslik + ozellikler */}
        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-bold leading-tight text-white">
            Fiyat hedefine ulaşınca{' '}
            <span className="text-bn-gold">anında</span> haberin olsun.
          </h2>
          <p className="mt-4 text-slate-300">
            Borsadan canlı fiyat akışını dinleyen gerçek zamanlı bir motor; hedefin
            tutunca saniyesinde bildirir.
          </p>

          <ul className="mt-8 space-y-3 text-sm text-slate-300">
            <Feature icon={<Zap className="h-4 w-4 text-bn-gold" />}>
              Saniyede on binlerce tick işleyen thread-safe motor
            </Feature>
            <Feature icon={<Bell className="h-4 w-4 text-bn-gold" />}>
              Tetiklenince anlık canlı bildirim (SSE)
            </Feature>
            <Feature icon={<ShieldCheck className="h-4 w-4 text-bn-gold" />}>
              Hesabına özel, izole alarmlar
            </Feature>
          </ul>
        </div>

        <div className="relative z-10" />
      </aside>

      {/* ── SAĞ: form ─────────────────────────────────────────────────── */}
      <main className="flex w-full items-center justify-center bg-bn-bg px-6 py-12 lg:w-[45%]">
        <div className="w-full max-w-sm">
          {/* Mobilde marka (sol panel gizliyken) */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bn-gold/15 ring-1 ring-bn-gold/30">
              <Bell className="h-5 w-5 text-bn-gold" />
            </div>
            <span className="text-lg font-semibold text-white">Crypto Alarm</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isLogin ? 'Tekrar hoş geldin' : 'Hesap oluştur'}
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            {isLogin
              ? 'Devam etmek için giriş yap.'
              : 'Birkaç saniyede ücretsiz hesabını oluştur.'}
          </p>

          <div className="mt-8">
            {/* Mode degisince form sifirdan kurulsun (dogru resolver + temiz state) */}
            <AuthFields key={mode} mode={mode} />
          </div>

          <p className="mt-6 text-sm text-slate-400">
            {isLogin ? 'Hesabın yok mu? ' : 'Zaten hesabın var mı? '}
            <button
              type="button"
              onClick={() => setMode(isLogin ? 'register' : 'login')}
              className="font-semibold text-bn-gold transition hover:text-cyan-200"
            >
              {isLogin ? 'Kayıt ol' : 'Giriş yap'}
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}

function Feature({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
        {icon}
      </span>
      {children}
    </li>
  )
}

function AuthFields({ mode }: { mode: Mode }) {
  const { setAuth } = useAuth()
  const isLogin = mode === 'login'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(isLogin ? loginSchema : registerSchema),
    defaultValues: { username: '', password: '' },
  })

  const onSubmit = async (values: RegisterInput) => {
    try {
      const res = isLogin ? await loginUser(values) : await registerUser(values)
      toast.success(
        isLogin ? `Tekrar hoş geldin, ${res.username}` : `Hoş geldin, ${res.username}`,
      )
      setAuth(res.token, res.username) // en son: bu, dashboard'a gecisi tetikler
    } catch (err) {
      toast.error((err as ApiError).message ?? 'İşlem başarısız')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300">
          Kullanıcı adı
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            {...register('username')}
            autoComplete="username"
            placeholder="ataberk"
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-bn-gold/60 focus:bg-bn-line focus:ring-2 focus:ring-bn-gold/20"
          />
        </div>
        {errors.username && (
          <p className="mt-1 text-xs text-rose-400">{errors.username.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300">Şifre</label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            {...register('password')}
            type="password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            placeholder="••••••••"
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-bn-gold/60 focus:bg-bn-line focus:ring-2 focus:ring-bn-gold/20"
          />
        </div>
        {errors.password && (
          <p className="mt-1 text-xs text-rose-400">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-bn-gold py-2.5 font-semibold text-bn-bg transition hover:bg-bn-gold/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isLogin ? 'Giriş yap' : 'Kayıt ol'}
      </button>
    </form>
  )
}
