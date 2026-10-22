import { z } from 'zod'

import {
  DOC_TYPES,
  DOOR_TYPES,
  JAMB_TYPES,
  LIFT_TYPES,
  MACHINE_SUPPORTS,
  PAGE_KEYS,
} from '#/domain/config'

// One JSON blob per project. Changing the shape needs a version bump + a step in migrate.ts.
export const CURRENT_SCHEMA_VERSION = 1

/** Length in mm. */
const mm = z.number().int().positive()
const size = z.object({ w: mm, h: mm })
/** Free text; '' means "not filled in". */
const text = z.string()

export const Floor = z.object({
  name: z.string().min(1),
  /** Floor-to-floor height; null = not entered. Ignored for the top floor (its row is OH + top room). */
  height: mm.nullable(),
  jamb: z.enum(JAMB_TYPES),
  hasDoor: z.boolean(),
})

export const Revision = z.object({
  detail: text,
  change: text,
  date: text,
  number: text,
  by: text,
  checkedBy: text,
  approvedBy: text,
  requirement: text,
})

const PageOverride = z.object({
  completedDate: text.optional(),
  revisionNo: text.optional(),
})

export const ElevatorParams = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),

  /** A. Thông tin hồ sơ */
  project: z.object({
    name: z.string().min(1),
    address: text,
    /** Title-block address; '' = use `address`. */
    shortAddress: text,
    /** Cover "hạng mục"; '' = use the suggestion from derive. */
    category: text,
    quantity: z.number().int().positive(),
    issuePlace: text,
    issueMonth: text,
    docType: z.enum(DOC_TYPES),
    designer: text,
    checker: text,
    approver: text,
    completedDate: text,
    revisionNo: text,
    pageOverrides: z.partialRecord(z.enum(PAGE_KEYS), PageOverride),
  }),

  /** B. Đặc tính kỹ thuật */
  tech: z.object({
    liftType: z.enum(LIFT_TYPES),
    /** Free text, never generated (decision #3). */
    modelCode: text,
    loadKg: z.number().int().positive(),
    /** AH × BH */
    shaft: z.object({ width: mm, depth: mm }),
    /** CW × CD × CH */
    car: z.object({ width: mm, depth: mm, height: mm }),
    /** OP × HH */
    door: z.object({ width: mm, height: mm, type: z.enum(DOOR_TYPES) }),
    stops: z.number().int().min(2),
    doors: z.number().int().min(1),
    /** m/min */
    speed: z.number().positive(),
    machine: text,
    controller: text,
    pit: mm,
    overhead: mm,
    topRoomHeight: mm,
    mainPower: text,
    lightPower: text,
  }),

  /** C. Kết cấu hố & cửa tầng */
  structure: z.object({
    wall: mm,
    ringBeamTop: size,
    ringBeamFloor: size,
    doorHeadBeam: size,
    midBeam: z.object({ w: mm, h: mm, spacingTop: mm, spacing: mm }),
    roughOpeningHeight: mm,
    lintel: mm,
    callBox: z.object({ w: mm, h: mm, bottom: mm }),
    infillNote: z.boolean(),
  }),

  /** D. Danh sách tầng, bottom (1F) to top. */
  floors: z.array(Floor).min(2),

  /** E. Buồng trên cùng / phòng máy / móc treo */
  topRoom: z.object({
    name: z.string().min(1),
    /** Single CPM value printed on both the section and the machine-room sheet (decision #2). */
    cpm: size,
    machineSupport: z.enum(MACHINE_SUPPORTS),
    hook: z.object({
      loadTon: z.number().positive(),
      /** Distance from the left / front wall; null = shaft centre. */
      x: mm.nullable(),
      y: mm.nullable(),
    }),
    hoistDetail: z.object({ bar: mm, a: mm, b: mm }),
  }),

  /** F. Hạng mục trách nhiệm */
  responsibility: z.object({
    widthTol: mm,
    plumbTol: mm,
    pitDrill: mm,
    breaker: text,
    powerCable: text,
    neutralCable: text,
    /** m */
    spareLength: z.number().positive(),
    note: text,
  }),

  revisions: z.array(Revision),
})

export type ElevatorParams = z.infer<typeof ElevatorParams>
export type Floor = z.infer<typeof Floor>
export type Revision = z.infer<typeof Revision>
export type JambType = Floor['jamb']

/** Default floor list for `stops` stops: 1F wide jamb, the rest narrow, heights empty. */
export function makeFloors(stops: number): Array<Floor> {
  return Array.from({ length: stops }, (_, i) => ({
    name: `${i + 1}F`,
    height: null,
    jamb: i === 0 ? 'wide' : 'narrow',
    hasDoor: true,
  }))
}
