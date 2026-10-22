import { CLEARANCE, JAMB_TYPE_LABELS, PIT_OH_BY_SPEED } from '#/domain/config'
import { jambsInUse, landingOpening } from '#/domain/derive'
import type { ElevatorParams } from '#/domain/schema'

// Cross-field rules on top of the Zod shape. `error` blocks PDF export; `warning` does not.

export type Issue = {
  level: 'error' | 'warning'
  /** Dotted field path the form attaches the message to, e.g. "tech.car.width". */
  path: string
  message: string
}

const ENGINEER_NOTE = 'kỹ sư cần xác nhận'

export function checkRules(p: ElevatorParams): Array<Issue> {
  const issues: Array<Issue> = []
  const error = (path: string, message: string) =>
    issues.push({ level: 'error', path, message })
  const warning = (path: string, message: string) =>
    issues.push({ level: 'warning', path, message })

  const { shaft, car, door } = p.tech

  if (car.width + CLEARANCE.minWidthGap > shaft.width) {
    error(
      'tech.car.width',
      `Cabin rộng ${car.width} + khe ray ${CLEARANCE.minWidthGap} vượt bề rộng hố ${shaft.width}.`,
    )
  }
  if (car.depth + CLEARANCE.minDepthGap > shaft.depth) {
    error(
      'tech.car.depth',
      `Cabin sâu ${car.depth} + khoảng đối trọng/ngưỡng cửa ${CLEARANCE.minDepthGap} vượt chiều sâu hố ${shaft.depth}.`,
    )
  }

  const maxOpening = shaft.width - 2 * CLEARANCE.minOpeningSide
  for (const jamb of jambsInUse(p.floors)) {
    const { width } = landingOpening(p, jamb)
    const name = JAMB_TYPE_LABELS[jamb].toLowerCase()
    if (door.width > width) {
      error(
        'tech.door.width',
        `Cửa OP ${door.width} lớn hơn lỗ chờ ${width} (${name}).`,
      )
    }
    if (width > maxOpening) {
      error(
        'tech.shaft.width',
        `Lỗ chờ ${width} (${name}) vượt ${maxOpening} = bề rộng hố ${shaft.width} − 2 × ${CLEARANCE.minOpeningSide}.`,
      )
    }
  }

  if (door.height >= p.structure.roughOpeningHeight) {
    error(
      'tech.door.height',
      `Cửa HH ${door.height} phải thấp hơn chiều cao lỗ chờ thô ${p.structure.roughOpeningHeight}.`,
    )
  }

  if (p.floors.length !== p.tech.stops) {
    error(
      'floors',
      `Danh sách có ${p.floors.length} tầng nhưng số điểm dừng là ${p.tech.stops}.`,
    )
  }

  const ref = PIT_OH_BY_SPEED.find((r) => p.tech.speed <= r.maxSpeed)
  if (!ref) {
    warning(
      'tech.speed',
      `Tốc độ ${p.tech.speed} m/phút nằm ngoài bảng tra PIT/OH — ${ENGINEER_NOTE}.`,
    )
  } else {
    if (p.tech.pit < ref.pit) {
      warning(
        'tech.pit',
        `PIT ${p.tech.pit} thấp hơn mức tham khảo ${ref.pit} cho ${p.tech.speed} m/phút — ${ENGINEER_NOTE}.`,
      )
    }
    if (p.tech.overhead < ref.overhead) {
      warning(
        'tech.overhead',
        `OH ${p.tech.overhead} thấp hơn mức tham khảo ${ref.overhead} cho ${p.tech.speed} m/phút — ${ENGINEER_NOTE}.`,
      )
    }
  }

  return issues
}

export function hasBlockingErrors(issues: Array<Issue>): boolean {
  return issues.some((i) => i.level === 'error')
}
