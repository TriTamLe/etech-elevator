import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { drizzle } from 'drizzle-orm/sqlite-proxy'
import { beforeEach, describe, expect, it } from 'vitest'

import * as schema from '#/db/schema'
import { presetParams } from '#/domain/presets'
import * as repo from '#/server/project-repo'
import type { ProjectDb } from '#/server/project-repo'

// Runs the repo against an in-memory node:sqlite database built from the real drizzle
// migrations, so the SQL matches what D1 executes.

function makeDb(): { db: ProjectDb; sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(':memory:')
  for (const file of readdirSync('drizzle').filter((f) => f.endsWith('.sql')).sort()) {
    for (const stmt of readFileSync(`drizzle/${file}`, 'utf8').split('--> statement-breakpoint')) {
      if (stmt.trim()) sqlite.exec(stmt)
    }
  }
  const db = drizzle(
    (sql, params, method) => {
      const stmt = sqlite.prepare(sql)
      const args = params as Array<string | number | null>
      if (method === 'run') {
        stmt.run(...args)
        return Promise.resolve({ rows: [] })
      }
      if (method === 'get') {
        const row = stmt.get(...args)
        return Promise.resolve({ rows: row ? Object.values(row) : [] })
      }
      return Promise.resolve({
        rows: stmt.all(...args).map((r) => Object.values(r)),
      })
    },
    { schema },
  )
  return { db, sqlite }
}

let db: ProjectDb
let sqlite: DatabaseSync

beforeEach(() => {
  ;({ db, sqlite } = makeDb())
})

describe('project repo', () => {
  it('creates a project and mirrors name/address into list columns', async () => {
    const params = presetParams('house-5f')
    const created = await repo.create(db, params)
    expect(created.name).toBe(params.project.name)
    expect(created.address).toBe(params.project.address)

    const rows = await repo.list(db)
    expect(rows).toHaveLength(1)
    expect(Object.keys(rows[0]).sort()).toEqual(['address', 'id', 'name', 'updatedAt'])
    expect(rows[0].updatedAt).toBeInstanceOf(Date)
  })

  it('round-trips params through get', async () => {
    const params = presetParams('hotel-9f')
    const { id } = await repo.create(db, params)
    const detail = await repo.get(db, id)
    expect(detail?.params).toEqual(params)
    expect(await repo.get(db, 'missing')).toBeNull()
  })

  it('updateInfo changes columns and params.project together', async () => {
    const { id } = await repo.create(db, presetParams('house-5f'))
    const updated = await repo.updateInfo(db, id, {
      name: ' NHÀ ANH BA ',
      address: '12 Lê Lợi, Hải Châu',
    })
    expect(updated).toMatchObject({ name: 'NHÀ ANH BA', address: '12 Lê Lợi, Hải Châu' })
    const project = (await repo.get(db, id))?.params.project
    expect(project?.name).toBe('NHÀ ANH BA')
    expect(project?.address).toBe('12 Lê Lợi, Hải Châu')
  })

  it('updateInfo accepts an empty address and rejects unknown ids', async () => {
    const { id } = await repo.create(db, presetParams('house-5f'))
    expect((await repo.updateInfo(db, id, { name: 'X', address: '' }))?.address).toBe('')
    expect(await repo.updateInfo(db, 'missing', { name: 'X', address: '' })).toBeNull()
  })

  it('save rejects params that fail the schema', async () => {
    const { id } = await repo.create(db, presetParams('house-5f'))
    const bad = { ...presetParams('house-5f'), tech: { loadKg: -1 } }
    await expect(repo.save(db, id, bad as never)).rejects.toThrow()
  })

  it('soft-deletes and restores', async () => {
    const { id } = await repo.create(db, presetParams('house-5f'))
    expect(await repo.softDelete(db, id)).toBe(true)
    expect(await repo.list(db)).toHaveLength(0)
    expect(await repo.get(db, id)).toBeNull()
    const raw = sqlite.prepare('select deleted_at from projects where id = ?').get(id)
    expect(raw?.deleted_at).not.toBeNull()

    expect(await repo.softDelete(db, id)).toBe(false)
    expect(await repo.restore(db, id)).toBe(true)
    expect(await repo.restore(db, id)).toBe(false)
    expect(await repo.list(db)).toHaveLength(1)
  })

  it('duplicates with a "(bản sao)" suffix and a new id', async () => {
    const source = await repo.create(db, presetParams('hotel-9f'))
    const copy = await repo.duplicate(db, source.id)
    expect(copy?.id).not.toBe(source.id)
    expect(copy?.name).toBe(`${source.name} (bản sao)`)
    expect(await repo.list(db)).toHaveLength(2)
    expect(await repo.duplicate(db, 'missing')).toBeNull()
  })

  it('saves and lists versions', async () => {
    const { id } = await repo.create(db, presetParams('house-5f'))
    const v = await repo.saveVersion(db, id, 'Gửi khách lần 1')
    expect(v?.note).toBe('Gửi khách lần 1')
    const versions = await repo.listVersions(db, id)
    expect(versions?.map((x) => x.id)).toEqual([v?.id])
    expect(await repo.listVersions(db, 'missing')).toBeNull()
  })

  it('getVersion returns the snapshot, not later edits', async () => {
    const params = presetParams('house-5f')
    const { id } = await repo.create(db, params)
    const v = await repo.saveVersion(db, id, null)
    await repo.updateInfo(db, id, { name: 'ĐỔI SAU', address: '' })
    const snap = await repo.getVersion(db, id, v?.id ?? '')
    expect(snap?.params.project.name).toBe(params.project.name)
    expect(await repo.getVersion(db, 'other', v?.id ?? '')).toBeNull()
  })

  it('hides versions of a deleted project', async () => {
    const { id } = await repo.create(db, presetParams('house-5f'))
    const v = await repo.saveVersion(db, id, null)
    await repo.softDelete(db, id)
    expect(await repo.listVersions(db, id)).toBeNull()
    expect(await repo.getVersion(db, id, v?.id ?? '')).toBeNull()
  })
})
