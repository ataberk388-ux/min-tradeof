import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Copy, KeyRound, Moon, RefreshCw, Sun, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { ACCENTS, useAccent } from '@/hooks/useAccent'
import { changePassword, type ApiError } from '@/lib/api'

const APIKEY_STORE = 'cryptoalarm.apikey'

function randomKey() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Hesap/Profil sayfasi: kimlik + sifre degistirme + tercihler + (mock) API anahtari. */
export function ProfilePage() {
  const { username, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const { accent, setAccent } = useAccent()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(APIKEY_STORE) ?? '')

  const submitPassword = async () => {
    if (next.length < 6) {
      toast.error('Yeni şifre en az 6 karakter')
      return
    }
    if (next !== confirm) {
      toast.error('Yeni şifreler eşleşmiyor')
      return
    }
    setSaving(true)
    try {
      await changePassword({ currentPassword: current, newPassword: next })
      toast.success('Şifre güncellendi')
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (err) {
      toast.error((err as unknown as ApiError).message ?? 'Şifre değiştirilemedi')
    } finally {
      setSaving(false)
    }
  }

  const genKey = () => {
    const k = randomKey()
    setApiKey(k)
    localStorage.setItem(APIKEY_STORE, k)
    toast.success('Yeni API anahtarı oluşturuldu')
  }

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey)
    toast.success('Kopyalandı')
  }

  return (
    <div className="mx-auto h-full max-w-3xl overflow-auto px-4 py-5">
      <h1 className="mb-5 text-xl font-bold text-bn-txt">Hesap</h1>

      {/* Kimlik */}
      <Section title="Profil">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bn-gold/15 text-lg font-bold text-bn-gold">
            {(username ?? '?').slice(0, 1).toUpperCase()}
          </span>
          <div>
            <p className="flex items-center gap-1.5 font-semibold text-bn-txt">
              <User className="h-4 w-4 text-bn-sub" />
              {username ?? '—'}
            </p>
            <p className="text-xs text-bn-sub">Paper trading hesabı</p>
          </div>
          <button
            onClick={logout}
            className="ml-auto rounded-md border border-bn-line px-3 py-1.5 text-sm text-bn-sub transition hover:border-bn-down/40 hover:text-bn-down"
          >
            Çıkış yap
          </button>
        </div>
      </Section>

      {/* Sifre */}
      <Section title="Şifre Değiştir">
        <div className="grid gap-3 sm:max-w-sm">
          <Pwd label="Mevcut şifre" value={current} onChange={setCurrent} autoComplete="current-password" />
          <Pwd label="Yeni şifre" value={next} onChange={setNext} autoComplete="new-password" />
          <Pwd label="Yeni şifre (tekrar)" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          <button
            onClick={submitPassword}
            disabled={saving || !current || !next}
            className="mt-1 rounded-md bg-bn-gold py-2 text-sm font-semibold text-bn-bg transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Kaydediliyor…' : 'Şifreyi güncelle'}
          </button>
        </div>
      </Section>

      {/* Tercihler */}
      <Section title="Tercihler">
        <div className="flex items-center justify-between">
          <span className="text-sm text-bn-txt">Tema</span>
          <button
            onClick={toggle}
            className="flex items-center gap-1.5 rounded-md border border-bn-line px-3 py-1.5 text-sm text-bn-sub transition hover:text-bn-txt"
          >
            {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            {theme === 'dark' ? 'Koyu' : 'Açık'}
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-bn-txt">Vurgu rengi</span>
          <div className="flex gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.rgb}
                onClick={() => setAccent(a.rgb)}
                title={a.name}
                className={`h-6 w-6 rounded-full transition ${accent === a.rgb ? 'ring-2 ring-bn-txt ring-offset-2 ring-offset-bn-panel' : ''}`}
                style={{ background: `rgb(${a.rgb})` }}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* API anahtari (mock) */}
      <Section title="API Anahtarı">
        <p className="mb-2 text-xs text-bn-sub">
          Demo amaçlı sahte anahtar (yalnız tarayıcında saklanır). Gerçek bir borsa bağlantısı değildir.
        </p>
        {apiKey ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border border-bn-line bg-bn-panel2 px-3 py-2 font-mono text-xs text-bn-txt">
              {apiKey}
            </code>
            <button onClick={copyKey} className="rounded-md border border-bn-line p-2 text-bn-sub transition hover:text-bn-gold" title="Kopyala">
              <Copy className="h-4 w-4" />
            </button>
            <button onClick={genKey} className="rounded-md border border-bn-line p-2 text-bn-sub transition hover:text-bn-gold" title="Yenile">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button onClick={genKey} className="flex items-center gap-1.5 rounded-md bg-bn-gold px-3 py-2 text-sm font-semibold text-bn-bg transition hover:opacity-90">
            <KeyRound className="h-4 w-4" />
            API anahtarı oluştur
          </button>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-4 rounded-lg border border-bn-line bg-bn-panel p-4">
      <h2 className="mb-3 text-sm font-semibold text-bn-txt">{title}</h2>
      {children}
    </section>
  )
}

function Pwd({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-bn-sub">{label}</span>
      <input
        type="password"
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-bn-line bg-bn-panel2 px-3 py-2 text-sm text-bn-txt outline-none focus:border-bn-gold/50"
      />
    </label>
  )
}
