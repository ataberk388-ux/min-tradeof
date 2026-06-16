import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { createAlarmSchema, type CreateAlarmInput } from '@/lib/schema'
import { useCreateAlarm } from '@/hooks/useAlarms'
import { useActiveSymbol } from '@/hooks/useActiveSymbol'
import { SymbolCombobox } from '@/components/trade/SymbolCombobox'
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
  const { symbol: activeSymbol } = useActiveSymbol()
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateAlarmInput>({
    resolver: zodResolver(createAlarmSchema),
    defaultValues: { symbol: activeSymbol, targetPrice: '', direction: 'ABOVE', type: 'PRICE' },
  })

  const type = watch('type')
  const isPercent = type === 'PERCENT'

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
        <Label>Sembol</Label>
        <Controller
          control={control}
          name="symbol"
          render={({ field }) => (
            <SymbolCombobox value={field.value} onChange={field.onChange} />
          )}
        />
        {errors.symbol && <p className="text-sm text-destructive">{errors.symbol.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Alarm türü</Label>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Tür seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRICE">Fiyat — hedef fiyata gelince</SelectItem>
                <SelectItem value="PERCENT">% Değişim — 24s yüzde eşiği</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetPrice">{isPercent ? 'Yüzde eşiği (%)' : 'Hedef fiyat'}</Label>
        <Input
          id="targetPrice"
          inputMode="decimal"
          placeholder={isPercent ? '5' : '60000'}
          {...register('targetPrice')}
        />
        {errors.targetPrice && (
          <p className="text-sm text-destructive">{errors.targetPrice.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Yön</Label>
        <Controller
          control={control}
          name="direction"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Yön seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ABOVE">
                  {isPercent ? 'ABOVE — %+eşik üstüne çıkınca' : 'ABOVE — fiyat yükselince'}
                </SelectItem>
                <SelectItem value="BELOW">
                  {isPercent ? 'BELOW — %−eşik altına inince' : 'BELOW — fiyat düşünce'}
                </SelectItem>
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
