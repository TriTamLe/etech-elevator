import * as React from 'react'

import { SHEET, STROKE } from '#/drawing/types'
import type { ArcPrim, LinesPrim, Prim, Weight } from '#/drawing/types'

// Prim[] → SVG for the preview, and (P5c) the same element for svg2pdf. Only plain
// elements: no <pattern>, <use>, <foreignObject> or filters, which svg2pdf mishandles.

/**
 * Drawing ink. Deliberately not a UI token: a construction sheet prints black on white
 * whatever the app theme is.
 */
const INK = '#000'
const PAPER = '#fff'
export const DRAWING_FONT = 'Tinos'

const DEFAULT_WEIGHT: Weight = 'medium'
const sw = (w: Weight | undefined) => STROKE[w ?? DEFAULT_WEIGHT]

/** SVG path for an arc; sweep-flag 1 = increasing angle (clockwise on screen, y down). */
export function arcPath({ c, r, start, end }: ArcPrim): string {
  const rad = (deg: number) => (deg * Math.PI) / 180
  const sweep = end - start
  const x0 = c.x + r * Math.cos(rad(start))
  const y0 = c.y + r * Math.sin(rad(start))
  // SVG drops an arc whose ends coincide: draw a full turn as two half arcs.
  if (sweep >= 360) {
    const xm = c.x + r * Math.cos(rad(start + 180))
    const ym = c.y + r * Math.sin(rad(start + 180))
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${xm} ${ym} A ${r} ${r} 0 0 1 ${x0} ${y0}`
  }
  const x1 = c.x + r * Math.cos(rad(end))
  const y1 = c.y + r * Math.sin(rad(end))
  const large = sweep > 180 ? 1 : 0
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`
}

/** Coordinates in a path string: 0.01 mm is far below what prints. */
const round = (v: number) => Math.round(v * 100) / 100

/**
 * Length given to a zero-length segment. A zero-length subpath with round caps should
 * draw a dot, but renderers (and PDF converters) disagree on it; a tiny real segment
 * draws the same dot everywhere.
 */
const DOT = 0.02

/** One SVG path for many separate segments ("M x1 y1 L x2 y2 M …"). */
export function linesPath({ segs }: LinesPrim): string {
  const parts: Array<string> = []
  for (let i = 0; i + 3 < segs.length; i += 4) {
    const [x1, y1, x2, y2] = segs.slice(i, i + 4).map(round)
    // Checked after rounding: a stroke shorter than the rounding step is a dot too.
    const x2d = x1 === x2 && y1 === y2 ? round(x2 + DOT) : x2
    parts.push(`M${x1} ${y1}L${x2d} ${y2}`)
  }
  return parts.join('')
}

function PrimElement({ prim }: { prim: Prim }) {
  switch (prim.kind) {
    case 'line':
      return (
        <line
          x1={prim.a.x}
          y1={prim.a.y}
          x2={prim.b.x}
          y2={prim.b.y}
          stroke={INK}
          strokeWidth={sw(prim.weight)}
          strokeLinecap="round"
        />
      )
    case 'rect':
      return (
        <rect
          x={prim.x}
          y={prim.y}
          width={prim.w}
          height={prim.h}
          rx={prim.r}
          ry={prim.r}
          fill={prim.fill === 'ink' ? INK : 'none'}
          stroke={INK}
          strokeWidth={sw(prim.weight)}
        />
      )
    case 'circle':
      return (
        <circle
          cx={prim.c.x}
          cy={prim.c.y}
          r={prim.r}
          fill="none"
          stroke={INK}
          strokeWidth={sw(prim.weight)}
        />
      )
    case 'polyline': {
      const points = prim.pts.map((p) => `${p.x},${p.y}`).join(' ')
      const Tag = prim.closed ? 'polygon' : 'polyline'
      return (
        <Tag
          points={points}
          fill={prim.fill === 'ink' ? INK : 'none'}
          stroke={INK}
          strokeWidth={sw(prim.weight)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    }
    case 'lines':
      return (
        <path
          d={linesPath(prim)}
          fill="none"
          stroke={INK}
          strokeWidth={sw(prim.weight)}
          strokeLinecap="round"
        />
      )
    case 'arc':
      return (
        <path
          d={arcPath(prim)}
          fill="none"
          stroke={INK}
          strokeWidth={sw(prim.weight)}
          strokeLinecap="round"
        />
      )
    case 'text':
      return (
        <text
          x={prim.x}
          y={prim.y}
          fontSize={prim.size}
          fontWeight={prim.bold ? 'bold' : 'normal'}
          fontStyle={prim.italic ? 'italic' : 'normal'}
          textAnchor={prim.anchor ?? 'start'}
          transform={
            prim.rotate
              ? `rotate(${prim.rotate} ${prim.x} ${prim.y})`
              : undefined
          }
          fill={INK}
          xmlSpace="preserve"
        >
          {prim.text}
        </text>
      )
    case 'image':
      return (
        <image
          href={prim.href}
          x={prim.x}
          y={prim.y}
          width={prim.w}
          height={prim.h}
          preserveAspectRatio="xMidYMid meet"
        />
      )
  }
}

/**
 * One A3 sheet, 420 × 297 mm user units; at CSS scale 1 it is paper size (1 mm = 1 mm).
 * Size it with CSS to scale it. Memoised: prim arrays are rebuilt only when params change.
 */
export const SheetSvg = React.memo(function SheetSvg({
  prims,
  label,
  className,
}: {
  prims: ReadonlyArray<Prim>
  /**
   * Accessible name, e.g. "Bìa" or "DTP 01 · Hạng mục trách nhiệm". `null` hides the
   * drawing from assistive tech (a thumbnail inside an already-labelled button).
   */
  label: string | null
  className?: string
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${SHEET.width} ${SHEET.height}`}
      width={`${SHEET.width}mm`}
      height={`${SHEET.height}mm`}
      {...(label === null
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': label })}
      fontFamily={DRAWING_FONT}
      // text-metrics ignores kerning (and so does jsPDF): keep the preview identical.
      style={{ fontKerning: 'none' }}
      className={className}
    >
      <rect
        x={0}
        y={0}
        width={SHEET.width}
        height={SHEET.height}
        fill={PAPER}
      />
      {prims.map((prim, i) => (
        // Prim lists are rebuilt as a whole on every change, so the index is a stable key.
        <PrimElement key={i} prim={prim} />
      ))}
    </svg>
  )
})
