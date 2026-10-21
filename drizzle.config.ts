import { defineConfig } from 'drizzle-kit'

// Only used to generate SQL migrations into ./drizzle.
// Migrations are applied with wrangler: `yarn db:migrate:local` / `yarn db:migrate:remote`.
export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'sqlite',
})
