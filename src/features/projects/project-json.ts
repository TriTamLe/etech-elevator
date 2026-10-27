import type { ElevatorParams } from '#/domain/schema'
import { downloadBlob } from '#/lib/download'
import { foldVi } from '#/lib/search'
import { getProject } from '#/server/projects'

/** "CÔNG TRÌNH MẪU 2 – NHÀ Ở" → "cong-trinh-mau-2-nha-o.json" */
export function projectFileName(name: string): string {
  const slug = foldVi(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'du-an'}.json`
}

/** Download params (with schemaVersion) as "<project-name>.json". */
export function downloadParamsJson(params: ElevatorParams): void {
  const blob = new Blob([JSON.stringify(params, null, 2)], {
    type: 'application/json',
  })
  downloadBlob(blob, projectFileName(params.project.name))
}

// A project export is a few KB; anything far larger is not one of ours.
const MAX_IMPORT_BYTES = 256 * 1024

/** Download a saved project's params as a JSON file. */
export async function exportProjectJson(id: string): Promise<void> {
  const project = await getProject({ data: { id } })
  downloadParamsJson(project.params)
}

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
