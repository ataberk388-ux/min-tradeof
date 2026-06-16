import axios from 'axios'
import type { AlarmDirection, AlarmType, CreateAlarmInput, LoginInput, RegisterInput } from './schema'
import { clearAuth, getToken, UNAUTHORIZED_EVENT } from './auth'

/** Backend'in dondurdugu alarm temsili (AlarmResponse). */
export interface Alarm {
  id: number
  symbol: string
  targetPrice: number
  direction: AlarmDirection
  type: AlarmType
  active: boolean
  createdAt: string
  triggeredAt: string | null
}

/** Backend'in tek-tip hata govdesi (ApiError). */
export interface ApiError {
  code: string
  message: string
  fields: Record<string, string>
}

/** API kok adresi: hem axios hem de SSE (EventSource) tek kaynaktan okusun. */
export const API_BASE_URL = 'http://localhost:8080/api'

/** Global axios instance: tek yerde baseURL + ortak hata isleme. */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Her istege JWT'yi ekle (varsa). Tek yerde, tum cagrilara otomatik uygulanir.
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Backend'in ApiError formatini tek yerde normalize et; her cagri ayni sekli alir.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url: string = error.config?.url ?? ''
    // Oturum dusmus (token gecersiz/suresi gecmis): auth uclari haric, cikis yaptir.
    if (status === 401 && !url.includes('/auth/')) {
      clearAuth()
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    const data = error.response?.data as ApiError | undefined
    return Promise.reject(
      data ?? { code: 'NETWORK', message: error.message ?? 'Baglanti hatasi', fields: {} },
    )
  },
)

export async function listAlarms(): Promise<Alarm[]> {
  const { data } = await api.get<Alarm[]>('/alarms')
  return data
}

export async function createAlarm(input: CreateAlarmInput): Promise<Alarm> {
  const { data } = await api.post<Alarm>('/alarms', input)
  return data
}

export async function deleteAlarm(id: number): Promise<void> {
  await api.delete(`/alarms/${id}`)
}

export async function updateAlarm(id: number, input: CreateAlarmInput): Promise<Alarm> {
  const { data } = await api.put<Alarm>(`/alarms/${id}`, input)
  return data
}

export async function reorderAlarms(orderedIds: number[]): Promise<void> {
  await api.put('/alarms/reorder', orderedIds)
}

/** Dashboard istatistikleri (StatsResponse). */
export interface Stats {
  ticksPerSecond: number
  totalTicks: number
  activeAlarms: number
  totalTriggered: number
  wsConnected: boolean
}

export async function getStats(): Promise<Stats> {
  const { data } = await api.get<Stats>('/stats')
  return data
}

/** Backend'in auth cevabi (AuthResponse). */
export interface AuthResponse {
  token: string
  username: string
}

export async function registerUser(input: RegisterInput): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', input)
  return data
}

export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', input)
  return data
}

export default api
