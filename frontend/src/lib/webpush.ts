/**
 * Tarayici/OS seviyesinde bildirim (Web Notifications + service worker).
 *
 * Not: Bu, uygulama acikken (SSE ile alarm tetiklenince) gercek bir OS bildirimi gosterir;
 * arka plandaki sekmede de calisir. Sekme tamamen kapaliyken push icin VAPID + sunucu
 * tarafli web-push gerekir (gelecekte eklenebilir) — burada istemci-tarafli pratik cozum.
 */

const PREF_KEY = 'cryptoalarm.pushEnabled'
const ICON = '/app-icon.svg'

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function pushPermission(): NotificationPermission | 'unsupported' {
  return isPushSupported() ? Notification.permission : 'unsupported'
}

export function pushEnabled(): boolean {
  return (
    isPushSupported() &&
    Notification.permission === 'granted' &&
    localStorage.getItem(PREF_KEY) === '1'
  )
}

export function setPushPref(enabled: boolean): void {
  localStorage.setItem(PREF_KEY, enabled ? '1' : '0')
}

/** Izin ister; kullanici onaylarsa tercihi acar. Sonucu (acik mi) doner. */
export async function requestPush(): Promise<boolean> {
  if (!isPushSupported()) return false
  const result = await Notification.requestPermission()
  const ok = result === 'granted'
  setPushPref(ok)
  return ok
}

/** Tercih acik ve izin varsa OS bildirimi gosterir (service worker uzerinden, varsa). */
export async function showSystemNotification(title: string, body: string): Promise<void> {
  if (!pushEnabled()) return
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, { body, icon: ICON, badge: ICON, tag: 'cryptoalarm' })
    } else {
      new Notification(title, { body, icon: ICON })
    }
  } catch {
    /* bildirim gosterilemezse sessizce gec */
  }
}
