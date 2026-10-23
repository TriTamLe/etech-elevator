import { house5f } from '#/domain/presets/house-5f'
import { hotel9f } from '#/domain/presets/hotel-9f'
import type { ElevatorParams } from '#/domain/schema'

export const PRESET_IDS = ['hotel-9f', 'house-5f'] as const
export type PresetId = (typeof PRESET_IDS)[number]

export const PRESETS: ReadonlyArray<{
  id: PresetId
  label: string
  description: string
  params: ElevatorParams
}> = [
  {
    id: 'hotel-9f',
    label: 'Khách sạn 9 tầng',
    description: '750 kg · hố 1800 × 2000 · 9 điểm dừng · sàn đặt máy',
    params: hotel9f,
  },
  {
    id: 'house-5f',
    label: 'Nhà ở 5 tầng',
    description: '550 kg · hố 1500 × 1900 · 5 điểm dừng · dầm đặt máy 3 phía',
    params: house5f,
  },
]

/** A fresh, mutable copy of a preset's params (never hand out the shared object). */
export function presetParams(id: PresetId): ElevatorParams {
  const preset = PRESETS.find((p) => p.id === id)
  if (!preset) throw new Error(`Không có bộ mẫu "${id}"`)
  return structuredClone(preset.params)
}
