import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { createAlarmSchema, type CreateAlarmInput } from '@/lib/schema'
import { useCreateAlarm } from '@/hooks/useAlarms'
import type { ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function AlarmForm() {
  const createMutation = useCreateAlarm()
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateAlarmInput>({
    resolver: zodResolver(createAlarmSchema),
    defaultValues: { symbol: '', targetPrice: '', direction: 'ABOVE' },
  })

  const onSubmit = (values: CreateAlarmInput) => {
    createMutation.mutate(values, {
      onSuccess: (alarm) => {
        toast.success(`Alarm kuruldu: ${alarm.symbol} ${alarm.direction} ${alarm.targetPrice}`)
        reset()
      },
      onError: (err) => toast.error((err as unknown as ApiError).message ?? 'Alarm kurulamadi'),
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="symbol">Sembol</Label>
        <Input id="symbol" placeholder="BTCUSDT" {...register('symbol')} />
        {errors.symbol && <p className="text-sm text-destructive">{errors.symbol.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetPrice">Hedef fiyat</Label>
        <Input id="targetPrice" inputMode="decimal" placeholder="60000" {...register('targetPrice')} />
        {errors.targetPrice && (
          <p className="text-sm text-destructive">{errors.targetPrice.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Yon</Label>
        <Controller
          control={control}
          name="direction"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Yon secin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ABOVE">ABOVE — fiyat yukselince</SelectItem>
                <SelectItem value="BELOW">BELOW — fiyat dusunce</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.direction && <p className="text-sm text-destructive">{errors.direction.message}</p>}
      </div>

      <Button
        type="submit"
        disabled={createMutation.isPending}
        className="w-full bg-bn-gold font-semibold text-bn-bg hover:bg-bn-gold/90"
      >
        {createMutation.isPending ? 'Kaydediliyor...' : 'Alarm kur'}
      </Button>
    </form>
  )
}
