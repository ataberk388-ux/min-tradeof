import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createAlarm, deleteAlarm, listAlarms, reorderAlarms, updateAlarm } from '@/lib/api'
import type { CreateAlarmInput } from '@/lib/schema'

const ALARMS_KEY = ['alarms'] as const

/** Aktif alarmlar = server state -> TanStack Query yonetir (cache + refetch). */
export function useAlarms() {
  return useQuery({ queryKey: ALARMS_KEY, queryFn: listAlarms })
}

/** Surukle-birak sonrasi yeni sirayi kalici yapar. */
export function useReorderAlarm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: reorderAlarms,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALARMS_KEY }),
  })
}

export function useCreateAlarm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createAlarm,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALARMS_KEY }),
  })
}

export function useDeleteAlarm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteAlarm,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALARMS_KEY }),
  })
}

export function useUpdateAlarm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: CreateAlarmInput }) => updateAlarm(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALARMS_KEY }),
  })
}
