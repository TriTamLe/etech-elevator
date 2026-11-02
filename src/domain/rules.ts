import {
  CLEARANCE,
  JAMB,
  PIT_OH_BY_SPEED,
  REVISION_TABLE_ROWS,
  jambLabelInline,
} from '#/domain/config'
import { jambsInUse, landingOpening } from '#/domain/derive'
import type { ElevatorParams } from '#/domain/schema'
import { formatDecimal } from '#/lib/format'

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
    const name = jambLabelInline(jamb)
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
    // The jamb frame must fit the rough opening (only the wide one can be too wide: the
    // narrow opening grows with OP). Drawn anyway, over the wall.
    const frame = JAMB.frame[jamb]
    const frameW = door.width + frame.extra
    // OP wider than the opening is already an error above.
    if (door.width <= width && frameW > width) {
      warning(
        'tech.door.width',
        `Khung ${name} rộng OP + ${frame.extra} = ${frameW}, vượt lỗ chờ ${width}.`,
      )
    }
    const frameH = door.height + frame.head
    const { roughOpeningHeight } = p.structure
    if (door.height < roughOpeningHeight && frameH > roughOpeningHeight) {
      warning(
        'tech.door.height',
        `Khung ${name} cao HH + ${frame.head} = ${frameH}, vượt chiều cao lỗ chờ thô ${roughOpeningHeight}.`,
      )
    }
  }

  // Call box hole beside the landing opening (right wall piece, up to the lintel).
  const jambs = jambsInUse(p.floors)
  if (jambs.length) {
    const { callBox, roughOpeningHeight } = p.structure
    const side = Math.max(
      0,
      Math.min(...jambs.map((j) => landingOpening(p, j).side)),
    )
    if (callBox.w > side) {
      warning(
        'structure.callBox.w',
        `Hộp gọi rộng ${callBox.w} lớn hơn đoạn tường ${formatDecimal(side)} cạnh lỗ chờ.`,
      )
    }
    if (callBox.bottom + callBox.h > roughOpeningHeight) {
      warning(
        'structure.callBox.h',
        `Hộp gọi cao tới ${callBox.bottom + callBox.h}, vượt chiều cao lỗ chờ thô ${roughOpeningHeight}.`,
      )
    }
  }

  if (door.height >= p.structure.roughOpeningHeight) {
    error(
      'tech.door.height',
      `Cửa HH ${door.height} phải thấp hơn chiều cao lỗ chờ thô ${p.structure.roughOpeningHeight}.`,
    )
  }

  if (door.type === '2S') {
    warning(
      'tech.door.type',
      'Chưa có ký hiệu cửa 2S trên bản vẽ, đang vẽ cửa mở giữa (CO).',
    )
  }

  const { hook, cpm } = p.topRoom
  const near = (v: number, size: number) =>
    v < CLEARANCE.hookWall || v > size - CLEARANCE.hookWall
  if (hook.x !== null && hook.x > shaft.width) {
    error(
      'topRoom.hook.x',
      `Móc treo cách tường trái ${hook.x}, nằm ngoài bề rộng hố ${shaft.width}.`,
    )
  } else if (hook.x !== null && near(hook.x, shaft.width)) {
    warning(
      'topRoom.hook.x',
      `Móc treo cách tường dưới ${CLEARANCE.hookWall} mm, ký hiệu móc sẽ chạm tường.`,
    )
  }
  if (hook.y !== null && hook.y > shaft.depth) {
    error(
      'topRoom.hook.y',
      `Móc treo cách tường trước ${hook.y}, nằm ngoài chiều sâu hố ${shaft.depth}.`,
    )
  } else if (hook.y !== null && near(hook.y, shaft.depth)) {
    warning(
      'topRoom.hook.y',
      `Móc treo cách tường dưới ${CLEARANCE.hookWall} mm, ký hiệu móc sẽ chạm tường.`,
    )
  }
  if (cpm.w > shaft.width) {
    error('topRoom.cpm.w', `CPM rộng ${cpm.w} vượt bề rộng hố ${shaft.width}.`)
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
      `Tốc độ ${formatDecimal(p.tech.speed)} m/phút nằm ngoài bảng tra PIT/OH — ${ENGINEER_NOTE}.`,
    )
  } else {
    if (p.tech.pit < ref.pit) {
      warning(
        'tech.pit',
        `PIT ${p.tech.pit} thấp hơn mức tham khảo ${ref.pit} cho ${formatDecimal(p.tech.speed)} m/phút — ${ENGINEER_NOTE}.`,
      )
    }
    if (p.tech.overhead < ref.overhead) {
      warning(
        'tech.overhead',
        `OH ${p.tech.overhead} thấp hơn mức tham khảo ${ref.overhead} cho ${formatDecimal(p.tech.speed)} m/phút — ${ENGINEER_NOTE}.`,
      )
    }
  }

  const hidden = p.revisions.length - REVISION_TABLE_ROWS
  if (hidden > 0) {
    warning(
      'revisions',
      `Bảng hiệu chỉnh trên bản vẽ chỉ có ${REVISION_TABLE_ROWS} dòng: in ${REVISION_TABLE_ROWS} lần mới nhất, ${hidden} lần cũ hơn không được in.`,
    )
  }

  return issues
}

export function hasBlockingErrors(issues: Array<Issue>): boolean {
  return issues.some((i) => i.level === 'error')
}
