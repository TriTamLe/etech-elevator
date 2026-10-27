import { COMPANY } from '#/config/company'
import type { ElevatorParams } from '#/domain/schema'
import { RESPONSIBILITY, SHEET_AREA } from '#/drawing/frame/layout'
import { fittedText, hline, text } from '#/drawing/prims'
import { ellipsize, measure, wrap } from '#/drawing/text-metrics'
import type { Prim } from '#/drawing/types'

// DTP 01 — the client's responsibilities. Wording follows the reference sheets word for
// word (spelling fixed), with group F's numbers dropped in.

export type ResponsibilityLine =
  /** Section name: `number` ("I / ") plain, `name` ("HỐ THANG:") underlined. */
  | { kind: 'section'; number: string; name: string }
  /** Numbered point. */
  | { kind: 'item'; text: string }
  /** "- …" sub point. */
  | { kind: 'sub'; text: string }
  /** Hand-broken continuation of the line above. */
  | { kind: 'cont'; text: string }

/** "2.5" → "2,5" for decimals in running Vietnamese text. */
const num = (n: number) => String(n).replace('.', ',')

/** Section IV holds the free "Ghi chú thêm"; one entry per line the user typed. */
export function noteLines(p: ElevatorParams): Array<string> {
  return p.responsibility.note
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
}

export function responsibilityLines(
  p: ElevatorParams,
): Array<ResponsibilityLine> {
  const r = p.responsibility
  const lines: Array<ResponsibilityLine> = [
    { kind: 'section', number: 'I / ', name: 'HỐ THANG:' },
    {
      kind: 'item',
      text: `1. Xây hố đúng kích thước với dung sai theo bản vẽ do ${COMPANY.nameInSentence} cung cấp`,
    },
    {
      kind: 'sub',
      text: `- Sai lệch chiều rộng đo từ đường trục đối xứng về mỗi bên không vượt quá +${r.widthTol}mm`,
    },
    {
      kind: 'sub',
      text: '- Sai lệch vị trí đường trục đối xứng của mỗi khoang tầng so với đường trục thẳng đứng chung',
    },
    {
      kind: 'cont',
      text: `ứng với tâm hố thang không vượt quá ${r.plumbTol}mm.`,
    },
    {
      kind: 'item',
      text: `2. Chống thấm đáy hố PIT để khi khoan sâu ${r.pitDrill} mm không thấm nước.`,
    },
    { kind: 'item', text: '3. Làm cầu thang xuống PIT.' },
    {
      kind: 'item',
      text: '4. Làm dầm bêtông giữ cửa ở vách trước, dầm bêtông giữ rail ở vách sau và hai vách bên',
    },
    {
      kind: 'cont',
      text: 'hố thang theo đúng bản vẽ. Thép tất cả các dầm phải được liên kết vào thép cột.',
    },
    {
      kind: 'item',
      text: '5. Chừa trống để lắp cửa tầng và hộp button theo đúng bản vẽ.',
    },
    {
      kind: 'item',
      text: '6. Hoàn thiện phần tường và sàn xung quanh các cửa tầng sau khi lắp thang.',
    },
    { kind: 'section', number: 'II / ', name: 'PHÒNG MÁY:' },
    { kind: 'item', text: '1. Bố trí móc treo ở nóc phòng máy.' },
    {
      kind: 'item',
      text: '2. Chừa lỗ thi công trên sàn phòng máy theo đúng bản vẽ.',
    },
    {
      kind: 'item',
      text: '3. Lắp đặt hệ thống thông thoáng ( quạt hút, cửa sổ thông gió, hoặc máy điều hòa,...)',
    },
    {
      kind: 'item',
      text: '4. Lắp cửa phòng máy có khóa và đèn chiếu sáng trong phòng máy.',
    },
    { kind: 'item', text: '5. Làm lối đi hoặc cầu thang bộ lên phòng máy.' },
    { kind: 'section', number: 'III / ', name: 'CUNG CẤP ĐIỆN:' },
    {
      kind: 'item',
      text: `1. Kéo dây điện 03 phase lên đến vị trí móc treo tại khu vực phòng máy ( để thừa khoảng ${num(r.spareLength)}m ).`,
    },
    { kind: 'item', text: '2. Cung cấp điện 03 phase :' },
    { kind: 'sub', text: `- 01 CB : ${r.breaker} ( tại khu vực phòng máy ).` },
    { kind: 'sub', text: `- Nguồn động lực : ${r.powerCable} / dây.` },
    { kind: 'sub', text: `- Trung hòa : ${r.neutralCable} / dây.` },
  ]
  const notes = noteLines(p)
  if (notes.length > 0) {
    lines.push({ kind: 'section', number: 'IV / ', name: 'GHI CHÚ:' })
    for (const n of notes) lines.push({ kind: 'item', text: n })
  }
  return lines
}

const R = RESPONSIBILITY
const MAX_W = SHEET_AREA.right - 2 - R.x

const indent = (kind: ResponsibilityLine['kind']) =>
  kind === 'sub' ? R.subIndent : kind === 'cont' ? R.contIndent : 0

/** One visual line after wrapping: a section, or a run of text at an indent. */
type Laid =
  | { kind: 'section'; number: string; name: string }
  | { kind: 'text'; text: string; dx: number }

/** Wrap long lines (user notes) at `size`; wrapped tails continue at the cont indent. */
function layOut(lines: Array<ResponsibilityLine>, size: number): Array<Laid> {
  const out: Array<Laid> = []
  for (const l of lines) {
    if (l.kind === 'section') {
      out.push(l)
      continue
    }
    const dx = indent(l.kind)
    const [first, ...rest] = wrap(
      l.text,
      MAX_W - dx,
      size,
      Number.POSITIVE_INFINITY,
    )
    out.push({ kind: 'text', text: first, dx })
    for (const t of rest) out.push({ kind: 'text', text: t, dx: R.contIndent })
  }
  return out
}

/**
 * DTP 01 content. Heading at its measured place; the body shrinks evenly (size and line
 * pitch, down to `minScale`) when a long note would run past the border, and drops the
 * last lines with "…" only beyond that.
 */
export function responsibilitySheet(p: ElevatorParams): Array<Prim> {
  const out: Array<Prim> = []
  const titleW = SHEET_AREA.right - SHEET_AREA.left - 4
  const heading = [
    'CÁC HẠNG MỤC KHÔNG THUỘC TRÁCH NHIỆM CỦA',
    COMPANY.shortName,
    '(Quý khách xin vui lòng xem xét, nghiên cứu kỹ để tránh những sai sót gây',
    'thiệt hại cho khách hàng, cũng như làm chậm tiến độ lắp thang máy)',
  ]
  heading.forEach((line, i) => {
    out.push(
      ...fittedText(
        R.center,
        R.titleBaselines[i],
        line,
        titleW,
        R.titleSize,
        R.size * R.minScale,
        {
          anchor: 'middle',
        },
      ),
    )
  })

  const lines = responsibilityLines(p)
  const room = R.maxBaseline - R.firstBaseline
  // Shrinking re-wraps the notes, so the line count depends on the scale: binary-search the
  // largest scale in [minScale, 1] at which every line fits (monotone: smaller never needs
  // more room).
  const fitsAt = (s: number) =>
    (layOut(lines, R.size * s).length - 1) * R.lineStep * s <= room + 1e-9
  let scale = 1
  if (!fitsAt(1)) {
    let lo: number = R.minScale
    let hi = 1
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2
      if (fitsAt(mid)) lo = mid
      else hi = mid
    }
    scale = lo
  }
  let laid = layOut(lines, R.size * scale)
  const size = R.size * scale
  const step = R.lineStep * scale
  const fit = Math.floor(room / step + 1e-9) + 1
  if (laid.length > fit) {
    laid = laid.slice(0, fit)
    const last = laid[fit - 1]
    laid[fit - 1] =
      last.kind === 'text'
        ? { ...last, text: ellipsize(`${last.text} …`, MAX_W - last.dx, size) }
        : { kind: 'text', text: '…', dx: 0 }
  }

  laid.forEach((l, i) => {
    const y = R.firstBaseline + i * step
    if (l.kind === 'section') {
      const nameX = R.x + measure(l.number, size)
      const nameW = measure(l.name, size)
      out.push(
        text(R.x, y, l.number, size),
        text(nameX, y, l.name, size),
        hline(y + R.underlineDrop * scale, nameX, nameX + nameW),
      )
    } else {
      out.push(
        ...fittedText(R.x + l.dx, y, l.text, MAX_W - l.dx, size, size * 0.8),
      )
    }
  })
  return out
}
