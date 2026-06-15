import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { API_BASE_URL } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import type { AlarmDirection } from '@/lib/schema'

/** Backend'in SSE ile ittigi tetikleme olayi (AlarmTriggeredEvent). */
interface TriggeredAlarm {
  id: number
  symbol: string
  targetPrice: number
  direction: AlarmDirection
  triggerPrice: number
  triggeredAt: string
}

/**
 * Canli tetikleme akisina abone olur: bir alarm tetiklendiginde anlik toast gosterir
 * ve aktif alarm listesini tazeler (tetiklenen alarm listeden duser).
 *
 * EventSource baglanti koparsa tarayici otomatik yeniden baglanir; ekstra is yok.
 */
export function useAlarmStream() {
  const queryClient = useQueryClient()
  const { token } = useAuth()

  useEffect(() => {
    if (!token) return
    // EventSource custom header gonderemez -> token'i query param ile gecer (backend buna izin verir).
    const source = new EventSource(`${API_BASE_URL}/alarms/stream?access_token=${token}`)

    source.addEventListener('alarm-triggered', (event) => {
      const a = JSON.parse((event as MessageEvent).data) as TriggeredAlarm
      const op = a.direction === 'ABOVE' ? '≥' : '≤'
      toast.success(`🔔 ALARM TETİKLENDİ`, {
        description: `${a.symbol} ${op} ${a.targetPrice} — anlık fiyat: ${a.triggerPrice}`,
      })
      queryClient.invalidateQueries({ queryKey: ['alarms'] })
    })

    return () => source.close()
  }, [queryClient, token])
}
