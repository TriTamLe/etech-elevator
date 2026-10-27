import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { COMPANY } from '#/config/company'
import { derive } from '#/domain/derive'
import type { ElevatorParams } from '#/domain/schema'
import { readyPages, renderPage } from '#/drawing/pages'
import { SheetSvg } from '#/drawing/render-svg'
import { SHEET } from '#/drawing/types'
import type { Prim } from '#/drawing/types'
import { ExportError } from '#/pdf/export-error'
import { addDrawingFonts } from '#/pdf/fonts'

// PDF = the preview's own <SheetSvg> element handed to svg2pdf, one A3 page per ready
// sheet; there is no PDF-only drawing path. jsPDF + svg2pdf load on the first export only.

export type ExportProgress = (done: number, total: number) => void

/** Renders a sheet's SVG into `host` synchronously and returns the <svg> element. */
function mountSheet(host: HTMLElement, prims: ReadonlyArray<Prim>) {
  const root = createRoot(host)
  flushSync(() => root.render(createElement(SheetSvg, { prims, label: null })))
  const svg = host.querySelector('svg')
  if (!svg) throw new ExportError('Không dựng được trang bản vẽ.')
  return { svg, unmount: () => root.unmount() }
}

/** A3 landscape vector PDF of every ready sheet of `params`, in set order. */
export async function exportPdf(
  params: ElevatorParams,
  { onProgress }: { onProgress?: ExportProgress } = {},
): Promise<Blob> {
  const [{ jsPDF }, { svg2pdf }] = await Promise.all([
    import('jspdf'),
    import('svg2pdf.js'),
  ])
  const d = derive(params)
  const pages = readyPages(d.pages)

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a3',
    compress: true,
    // Otherwise the 14 standard fonts are listed in every PDF although no text uses them.
    putOnlyUsedFonts: true,
  })
  await addDrawingFonts(doc)
  doc.setProperties({ title: params.project.name, creator: COMPANY.shortName })

  // svg2pdf reads computed styles, so the sheet must sit in the document (off-screen).
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText =
    'position:fixed;left:-10000px;top:0;width:0;height:0;overflow:hidden'
  document.body.appendChild(host)
  try {
    onProgress?.(0, pages.length)
    for (const [i, page] of pages.entries()) {
      if (i > 0) doc.addPage('a3', 'landscape')
      const { svg, unmount } = mountSheet(host, renderPage(params, d, page))
      try {
        await svg2pdf(svg, doc, {
          x: 0,
          y: 0,
          width: SHEET.width,
          height: SHEET.height,
        })
      } finally {
        unmount()
      }
      onProgress?.(i + 1, pages.length)
    }
  } finally {
    host.remove()
  }
  return doc.output('blob')
}
