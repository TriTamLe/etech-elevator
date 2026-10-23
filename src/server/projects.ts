import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { getDb } from '#/db'
import { PROJECT_TEXT_MAX } from '#/domain/config'
import { migrateImport } from '#/domain/migrate'
import { PRESET_IDS, presetParams } from '#/domain/presets'
import { ElevatorParams } from '#/domain/schema'
import * as repo from '#/server/project-repo'

// RPC surface for projects. Each handler validates input with Zod, then does one or two
// small D1 queries through project-repo (Workers free plan: 10 ms CPU per request).

const Id = z.string().min(1).max(64)
const Name = z.string().trim().min(1, 'Tên công trình không được để trống.').max(PROJECT_TEXT_MAX.name)
const Address = z.string().trim().max(PROJECT_TEXT_MAX.address)
const ById = z.object({ id: Id })

function found<T>(value: T | null | false): T {
  if (value === null || value === false) throw notFound()
  return value
}

export const listProjects = createServerFn({ method: 'GET' }).handler(() =>
  repo.list(getDb()),
)

export const getProject = createServerFn({ method: 'GET' })
  .validator(ById)
  .handler(async ({ data }) => found(await repo.get(getDb(), data.id)))

export const createProject = createServerFn({ method: 'POST' })
  .validator(
    z.discriminatedUnion('kind', [
      z.object({
        kind: z.literal('preset'),
        presetId: z.enum(PRESET_IDS),
        name: Name,
        address: Address.default(''),
      }),
      // Imported JSON file: any schema version, upgraded by migrate().
      z.object({ kind: z.literal('import'), params: z.unknown() }),
    ]),
  )
  .handler(({ data }) => {
    if (data.kind === 'preset') {
      const params = presetParams(data.presetId)
      params.project.name = data.name
      // The preset's address is a placeholder: start from what the user typed.
      params.project.address = data.address
      return repo.create(getDb(), params)
    }
    return repo.create(getDb(), migrateImport(data.params))
  })

export const duplicateProject = createServerFn({ method: 'POST' })
  .validator(ById)
  .handler(async ({ data }) => found(await repo.duplicate(getDb(), data.id)))

export const updateProjectInfo = createServerFn({ method: 'POST' })
  .validator(z.object({ id: Id, name: Name, address: Address }))
  .handler(async ({ data }) =>
    found(await repo.updateInfo(getDb(), data.id, data)),
  )

export const saveProject = createServerFn({ method: 'POST' })
  .validator(z.object({ id: Id, params: ElevatorParams }))
  .handler(async ({ data }) =>
    found(await repo.save(getDb(), data.id, data.params)),
  )

export const deleteProject = createServerFn({ method: 'POST' })
  .validator(ById)
  .handler(async ({ data }) => {
    found(await repo.softDelete(getDb(), data.id))
  })

export const restoreProject = createServerFn({ method: 'POST' })
  .validator(ById)
  .handler(async ({ data }) => {
    found(await repo.restore(getDb(), data.id))
  })

export const saveVersion = createServerFn({ method: 'POST' })
  .validator(
    z.object({ id: Id, note: z.string().trim().max(500).nullable() }),
  )
  .handler(async ({ data }) =>
    found(await repo.saveVersion(getDb(), data.id, data.note || null)),
  )

export const listVersions = createServerFn({ method: 'GET' })
  .validator(ById)
  .handler(async ({ data }) => found(await repo.listVersions(getDb(), data.id)))

export const getVersion = createServerFn({ method: 'GET' })
  .validator(z.object({ projectId: Id, versionId: Id }))
  .handler(async ({ data }) =>
    found(await repo.getVersion(getDb(), data.projectId, data.versionId)),
  )
