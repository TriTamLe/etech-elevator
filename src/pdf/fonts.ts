import type { jsPDF } from 'jspdf'

import { DRAWING_FONT } from '#/drawing/render-svg'
import { ExportError } from '#/pdf/export-error'

// The four Tinos faces served from public/, embedded so the PDF prints the same glyphs
// (and widths) as the preview. svg2pdf picks the face from font-weight/font-style.
const FACES = [
  ['Tinos-Regular.ttf', 'normal'],
  ['Tinos-Bold.ttf', 'bold'],
  ['Tinos-Italic.ttf', 'italic'],
  ['Tinos-BoldItalic.ttf', 'bolditalic'],
] as const

const FONT_DIR = '/fonts/tinos/'

type Face = { file: string; style: string; base64: string }

let faces: Promise<Array<Face>> | null = null

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  // Chunked: String.fromCharCode(...bytes) overflows the call stack on a 500 KB font.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

async function loadFace(file: string, style: string): Promise<Face> {
  const failed = new ExportError(
    'Không tải được font bản vẽ — kiểm tra mạng rồi thử lại.',
  )
  try {
    const res = await fetch(FONT_DIR + file)
    if (!res.ok) throw failed
    return { file, style, base64: toBase64(await res.arrayBuffer()) }
  } catch (e) {
    throw e instanceof ExportError
      ? e
      : new ExportError(failed.message, { cause: e })
  }
}

/** Fetches the faces once per page load; a failed fetch is retried on the next export. */
function loadFaces(): Promise<Array<Face>> {
  faces ??= Promise.all(FACES.map(([file, style]) => loadFace(file, style)))
  faces.catch(() => {
    faces = null
  })
  return faces
}

/** Registers Tinos (all four faces) on a new document. */
export async function addDrawingFonts(doc: jsPDF): Promise<void> {
  for (const face of await loadFaces()) {
    doc.addFileToVFS(face.file, face.base64)
    doc.addFont(face.file, DRAWING_FONT, face.style)
  }
}
