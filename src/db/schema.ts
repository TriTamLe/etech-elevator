import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// Elevator parameters are stored as one JSON blob per project, validated by the
// Zod schema in src/domain. Bump `schemaVersion` and add a migration step there
// whenever the parameter shape changes.
export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    // name/address mirror params.project.* so the list never reads the params blob.
    name: text('name').notNull(),
    address: text('address').notNull().default(''),
    params: text('params', { mode: 'json' }).notNull(),
    schemaVersion: integer('schema_version').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  },
  (table) => [index('projects_updated_at_idx').on(table.updatedAt)],
)

export const projectVersions = sqliteTable(
  'project_versions',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id),
    params: text('params', { mode: 'json' }).notNull(),
    schemaVersion: integer('schema_version').notNull(),
    note: text('note'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [index('project_versions_project_id_idx').on(table.projectId)],
)
