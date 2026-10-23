import { z } from 'zod'

import { CURRENT_SCHEMA_VERSION, ElevatorParams } from '#/domain/schema'

// Upgrade step from version v to v + 1. Add one entry per schema bump, e.g.
// `1: (old) => ({ ...old, schemaVersion: 2, newField: default })`.
type Step = (old: Record<string, unknown>) => Record<string, unknown>
const steps: Partial<Record<number, Step>> = {}

/** Bring stored / imported params (D1 row or JSON file) up to the current schema, then validate. */
export function migrate(raw: unknown): ElevatorParams {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Dữ liệu thông số không hợp lệ.')
  }
  let data = raw as Record<string, unknown>
  let version = data.schemaVersion
  if (
    typeof version !== 'number' ||
    !Number.isInteger(version) ||
    version < 1
  ) {
    throw new Error('Thiếu hoặc sai "schemaVersion" trong dữ liệu thông số.')
  }
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Dữ liệu ở phiên bản ${version}, mới hơn phiên bản web đang hỗ trợ (${CURRENT_SCHEMA_VERSION}).`,
    )
  }
  while (version < CURRENT_SCHEMA_VERSION) {
    const step = steps[version]
    if (!step)
      throw new Error(`Không có bước nâng cấp từ phiên bản ${version}.`)
    data = step(data)
    version += 1
  }
  return ElevatorParams.parse(data)
}

/**
 * migrate() for user files (JSON import): a shape error becomes one short Vietnamese
 * sentence naming the first bad path, instead of Zod's English JSON dump.
 */
export function migrateImport(raw: unknown): ElevatorParams {
  try {
    return migrate(raw)
  } catch (e) {
    if (e instanceof z.ZodError) {
      const issue = e.issues.at(0)
      const where = issue?.path.join('.') || 'gốc'
      throw new Error(`File không đúng cấu trúc thông số (sai ở “${where}”).`)
    }
    throw e
  }
}
