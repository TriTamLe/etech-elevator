import {
  DOC_TYPE_LABELS,
  DOOR_TYPE_LABELS,
  JAMB_TYPE_LABELS,
  LIFT_TYPE_LABELS,
  MACHINE_SUPPORT_LABELS,
} from '#/domain/config'

// [value, label] pairs for Select / Radio fields, in the config's declared order.
const pairs = <T extends string>(labels: Record<T, string>) =>
  Object.entries(labels) as Array<[T, string]>

export const DOC_TYPE_OPTIONS = pairs(DOC_TYPE_LABELS)
export const LIFT_TYPE_OPTIONS = pairs(LIFT_TYPE_LABELS)
export const DOOR_TYPE_OPTIONS = pairs(DOOR_TYPE_LABELS)
export const MACHINE_SUPPORT_OPTIONS = pairs(MACHINE_SUPPORT_LABELS)
export const JAMB_TYPE_OPTIONS = pairs(JAMB_TYPE_LABELS)
