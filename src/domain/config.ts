// Business constants that are not part of the form. All lengths in mm.

/** Landing rough opening width by jamb type (decision §6.1 #7). */
export const JAMB = {
  /** Wide jamb (JD320): fixed opening width. */
  wideOpening: 1100,
  /** Narrow jamb (35×50): opening = OP + this. */
  narrowExtra: 200,
} as const

/** Minimum clearances for the hard rules. Both sample sets have AH − CW = 400, BH − CD = 600. */
export const CLEARANCE = {
  /** Rail gap: CW + this ≤ AH. */
  minWidthGap: 400,
  /** Counterweight + sill: CD + this ≤ BH. */
  minDepthGap: 600,
  /** Wall left on each side of the landing opening (placeholder). */
  minOpeningSide: 100,
} as const

/**
 * Reference minimum PIT / OH by rated speed (m/min), ascending `maxSpeed`.
 * PLACEHOLDER values, loosely after TCVN 6395 / TCVN 7628 — kỹ sư cần xác nhận
 * trước khi dùng. Only produce warnings, never block export.
 */
export const PIT_OH_BY_SPEED: ReadonlyArray<{
  maxSpeed: number
  pit: number
  overhead: number
}> = [
  { maxSpeed: 45, pit: 1200, overhead: 3500 },
  { maxSpeed: 60, pit: 1400, overhead: 3600 },
  { maxSpeed: 90, pit: 1500, overhead: 3600 },
  { maxSpeed: 105, pit: 1600, overhead: 4000 },
  { maxSpeed: 150, pit: 1800, overhead: 4200 },
]

export const DOC_TYPES = [
  'reference',
  'basic-design',
  'approval',
  'construction',
  'revision',
  'as-built',
] as const

export const DOC_TYPE_LABELS: Record<(typeof DOC_TYPES)[number], string> = {
  reference: 'Tham khảo',
  'basic-design': 'Thiết kế cơ sở',
  approval: 'Trình duyệt',
  construction: 'Thi công',
  revision: 'Hiệu chỉnh',
  'as-built': 'Hoàn công',
}

export const LIFT_TYPES = ['mrl', 'machine-room'] as const

export const LIFT_TYPE_LABELS: Record<(typeof LIFT_TYPES)[number], string> = {
  mrl: 'Tải khách không phòng máy (MRL)',
  'machine-room': 'Tải khách có phòng máy',
}

export const DOOR_TYPES = ['CO', '2S'] as const

export const DOOR_TYPE_LABELS: Record<(typeof DOOR_TYPES)[number], string> = {
  CO: 'CO – mở giữa',
  '2S': '2S – lùa một bên',
}

export const MACHINE_SUPPORTS = ['floor', 'beams'] as const

export const MACHINE_SUPPORT_LABELS: Record<
  (typeof MACHINE_SUPPORTS)[number],
  string
> = {
  floor: 'Sàn đặt máy',
  beams: 'Dầm đặt máy 3 phía',
}

export const JAMB_TYPES = ['wide', 'narrow'] as const

export const JAMB_TYPE_LABELS: Record<(typeof JAMB_TYPES)[number], string> = {
  wide: 'Bao che rộng (JD320)',
  narrow: 'Bao che hẹp (35×50)',
}

/** Every sheet the set can contain, in the fixed export order (landing pages only when used). */
export const PAGE_KEYS = [
  'cover',
  'responsibility',
  'spec',
  'plan',
  'pit',
  'section',
  'landing-wide',
  'landing-narrow',
  'machine-room',
] as const

export const PAGE_TITLES: Record<(typeof PAGE_KEYS)[number], string> = {
  cover: 'Bản vẽ xây dựng thang máy',
  responsibility: 'Hạng mục trách nhiệm',
  spec: 'Đặc tính kỹ thuật',
  plan: 'Mặt cắt ngang thang máy',
  pit: 'Mặt cắt Pit hố thang',
  section: 'Mặt cắt đứng hố thang',
  'landing-wide': 'Chừa thô & hoàn thiện cửa tầng – bao che rộng',
  'landing-narrow': 'Chừa thô & hoàn thiện cửa tầng – bao che hẹp',
  'machine-room': 'Mặt cắt ngang phòng máy',
}

/** Sheet code prefix ("DTP 01"). */
export const PAGE_CODE_PREFIX = 'DTP'
