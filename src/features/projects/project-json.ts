import { foldVi } from '#/lib/search'
import { getProject } from '#/server/projects'

/** "CÔNG TRÌNH MẪU 2 – NHÀ Ở" → "cong-trinh-mau-2-nha-o.json" */
export function projectFileName(name: string): string {
  const slug = foldVi(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'du-an'}.json`
}

/** Download the project's params (with schemaVersion) as a JSON file. */
export async function exportProjectJson(id: string): Promise<void> {
  const project = await getProject({ data: { id } })
  const blob = new Blob([JSON.stringify(project.params, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = projectFileName(project.name)
  a.click()
  // Revoking in the same tick can cancel the download in Safari/Firefox.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// A project export is a few KB; anything far larger is not one of ours.
const MAX_IMPORT_BYTES = 256 * 1024

/** Read a picked .json file into an unknown value (migrate() validates it on the server). */
export async function readJsonFile(file: File): Promise<unknown> {
  if (file.size > MAX_IMPORT_BYTES) {
    throw new Error(`“${file.name}” quá lớn (tối đa 256 KB).`)
  }
  try {
    return JSON.parse(await file.text()) as unknown
  } catch {
    throw new Error(`“${file.name}” không phải file JSON hợp lệ.`)
  }
}
