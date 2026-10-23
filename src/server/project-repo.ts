import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'

import { projectVersions, projects } from '#/db/schema'
import type * as schema from '#/db/schema'
import { PROJECT_TEXT_MAX } from '#/domain/config'
import { migrate } from '#/domain/migrate'
import { CURRENT_SCHEMA_VERSION, ElevatorParams } from '#/domain/schema'

// Data access for projects, independent of the Worker runtime so tests can run it on
// plain SQLite. Server functions in projects.ts validate input and call these.

/** Any async drizzle SQLite database with our schema (D1 in the Worker, node:sqlite in tests). */
export type ProjectDb = BaseSQLiteDatabase<'async', unknown, typeof schema>

export type ProjectListItem = {
  id: string
  name: string
  address: string
  updatedAt: Date
}

export type ProjectDetail = ProjectListItem & { params: ElevatorParams }

export type VersionListItem = { id: string; note: string | null; createdAt: Date }

const listColumns = {
  id: projects.id,
  name: projects.name,
  address: projects.address,
  updatedAt: projects.updatedAt,
}

const alive = (id: string) => and(eq(projects.id, id), isNull(projects.deletedAt))

/** Light list columns only — never the params blob (Workers 10 ms CPU budget). */
export function list(db: ProjectDb): Promise<Array<ProjectListItem>> {
  return db
    .select(listColumns)
    .from(projects)
    .where(isNull(projects.deletedAt))
    .orderBy(desc(projects.updatedAt))
}

export async function get(
  db: ProjectDb,
  id: string,
): Promise<ProjectDetail | null> {
  const row = (
    await db
      .select({ ...listColumns, params: projects.params })
      .from(projects)
      .where(alive(id))
  ).at(0)
  if (!row) return null
  return { ...row, params: migrate(row.params) }
}

export async function create(
  db: ProjectDb,
  input: ElevatorParams,
): Promise<ProjectListItem> {
  const params = ElevatorParams.parse(input)
  const now = new Date()
  const item = {
    id: crypto.randomUUID(),
    name: params.project.name,
    address: params.project.address,
    updatedAt: now,
  }
  await db.insert(projects).values({
    ...item,
    params,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: now,
  })
  return item
}

export async function duplicate(
  db: ProjectDb,
  id: string,
): Promise<ProjectListItem | null> {
  const source = await get(db, id)
  if (!source) return null
  const params = structuredClone(source.params)
  const suffix = ' (bản sao)'
  params.project.name = `${params.project.name.slice(0, PROJECT_TEXT_MAX.name - suffix.length)}${suffix}`
  return create(db, params)
}

/** Writes params and refreshes the mirrored list columns. */
export async function save(
  db: ProjectDb,
  id: string,
  input: ElevatorParams,
): Promise<ProjectListItem | null> {
  const params = ElevatorParams.parse(input)
  const updatedAt = new Date()
  const rows = await db
    .update(projects)
    .set({
      name: params.project.name,
      address: params.project.address,
      params,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      updatedAt,
    })
    .where(alive(id))
    .returning(listColumns)
  return rows.at(0) ?? null
}

/** Edits name + address in params.project and their mirrored columns together. */
export async function updateInfo(
  db: ProjectDb,
  id: string,
  info: { name: string; address: string },
): Promise<ProjectListItem | null> {
  const current = await get(db, id)
  if (!current) return null
  return save(db, id, {
    ...current.params,
    project: {
      ...current.params.project,
      name: info.name.trim(),
      address: info.address.trim(),
    },
  })
}

export async function softDelete(db: ProjectDb, id: string): Promise<boolean> {
  const rows = await db
    .update(projects)
    .set({ deletedAt: new Date() })
    .where(alive(id))
    .returning({ id: projects.id })
  return rows.length > 0
}

export async function restore(db: ProjectDb, id: string): Promise<boolean> {
  const rows = await db
    .update(projects)
    .set({ deletedAt: null })
    .where(and(eq(projects.id, id), isNotNull(projects.deletedAt)))
    .returning({ id: projects.id })
  return rows.length > 0
}

/** Snapshot the current params as a named version. */
export async function saveVersion(
  db: ProjectDb,
  id: string,
  note: string | null,
): Promise<VersionListItem | null> {
  const current = await get(db, id)
  if (!current) return null
  const version = { id: crypto.randomUUID(), note, createdAt: new Date() }
  await db.insert(projectVersions).values({
    ...version,
    projectId: id,
    params: current.params,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  })
  return version
}

export function listVersions(
  db: ProjectDb,
  id: string,
): Promise<Array<VersionListItem>> {
  return db
    .select({
      id: projectVersions.id,
      note: projectVersions.note,
      createdAt: projectVersions.createdAt,
    })
    .from(projectVersions)
    .where(eq(projectVersions.projectId, id))
    .orderBy(desc(projectVersions.createdAt))
}
