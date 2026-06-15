import { useEffect, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BellOff, GripVertical, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { useAlarms, useDeleteAlarm, useReorderAlarm } from '@/hooks/useAlarms'
import { formatNum } from '@/lib/format'
import type { Alarm, ApiError } from '@/lib/api'

export function AlarmList() {
  const { data: alarms, isLoading, isError, error } = useAlarms()
  const deleteMutation = useDeleteAlarm()
  const reorderMutation = useReorderAlarm()

  // dnd-kit icin yerel sira (optimistik). Sunucu verisi degisince senkronla.
  const [items, setItems] = useState<Alarm[]>([])
  useEffect(() => {
    if (alarms) setItems(alarms)
  }, [alarms])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  if (isLoading) {
    return <p className="text-sm text-bn-sub">Yükleniyor…</p>
  }
  if (isError) {
    return (
      <p className="text-sm text-bn-down">
        {(error as unknown as ApiError)?.message ?? 'Liste alınamadı'}
      </p>
    )
  }
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-bn-line py-8 text-center">
        <BellOff className="mb-2 h-6 w-6 text-bn-sub" />
        <p className="text-sm font-medium text-bn-txt">Henüz aktif alarmın yok</p>
        <p className="mt-1 text-xs text-bn-sub">Soldan ilk alarmını kur.</p>
      </div>
    )
  }

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Alarm silindi'),
      onError: (err) => toast.error((err as unknown as ApiError).message ?? 'Silinemedi'),
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((a) => a.id === active.id)
    const newIndex = items.findIndex((a) => a.id === over.id)
    const next = arrayMove(items, oldIndex, newIndex)
    setItems(next)
    reorderMutation.mutate(next.map((a) => a.id))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {items.map((alarm) => (
            <SortableAlarmRow
              key={alarm.id}
              alarm={alarm}
              onDelete={() => handleDelete(alarm.id)}
              deleting={deleteMutation.isPending}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

function SortableAlarmRow({
  alarm,
  onDelete,
  deleting,
}: {
  alarm: Alarm
  onDelete: () => void
  deleting: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: alarm.id,
  })
  const isUp = alarm.direction === 'ABOVE'

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center justify-between rounded-md border border-bn-line bg-bn-panel2 px-2 py-2.5 ${
        isDragging ? 'z-10 opacity-90 ring-1 ring-bn-gold/40' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-bn-sub/60 transition hover:text-bn-sub active:cursor-grabbing"
          aria-label="Sürükle"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-md ring-1 ${
            isUp ? 'bg-bn-up/10 text-bn-up ring-bn-up/20' : 'bg-bn-down/10 text-bn-down ring-bn-down/20'
          }`}
        >
          {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        </span>
        <div className="text-left">
          <p className="text-sm font-semibold text-bn-txt">{alarm.symbol}</p>
          <p className="text-xs text-bn-sub">
            {isUp ? 'Yükselince' : 'Düşünce'} · {formatNum(alarm.targetPrice)}
          </p>
        </div>
      </div>
      <button
        onClick={onDelete}
        disabled={deleting}
        aria-label="Alarmı sil"
        className="flex h-8 w-8 items-center justify-center rounded-md text-bn-sub transition hover:bg-bn-line hover:text-bn-down disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  )
}
