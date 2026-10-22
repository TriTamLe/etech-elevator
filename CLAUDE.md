# Elevator drawing generator — project guide

Internal web app (1 user) that turns a parameter form into the A3 elevator construction drawing set (PDF) used by DTP. UI copy is 100% Vietnamese.

- Solution report (business rules, 14 confirmed decisions in §6): `docs/bao-cao-giai-phap-web-ban-ve-thang-may.md`
- Phase-by-phase plan with checkboxes — **update it as work lands**: `docs/super-plan.md`
- Intent skill loading for TanStack packages: @AGENTS.md

## Commands

Package manager is **yarn 1** — never run `npm install` / `pnpm` (no extra lockfiles).

- `yarn dev` (local D1 via the Cloudflare vite plugin) · `yarn build`
- `yarn typecheck` · `yarn lint` · `yarn test` — all must pass before a commit
- `yarn db:generate` after editing `src/db/schema.ts`, then `yarn db:migrate:local`
- `yarn cf-typegen` after editing `wrangler.jsonc`
- shadcn components: `npx shadcn@latest add <name>`

## Architecture rules

- Data flow: form params → `src/domain/derive.ts` → `src/drawing/sheets/*` (pure `params → Prim[]`) → `render-svg` → preview **and** PDF (jsPDF + svg2pdf.js, in the browser). Never add a PDF-only drawing path.
- Sheet functions are pure: no React, DOM, fetch, `Date.now()` or randomness (seeded only). Units are mm; never hard-code sample-project numbers.
- SVG for drawings: no `<pattern>` (hatch = real lines + `clipPath`), no `<use>`/`<foreignObject>`; drawing text uses Tinos.
- Server: `createServerFn` in `src/server/`, D1 via `getDb()` from `src/db/index.ts`. Keep requests tiny (Workers free plan: 10 ms CPU). The editor route uses `ssr: false`.
- Project params are one JSON blob validated by Zod with `schemaVersion`; changing the shape needs a bump + `migrate` step. Deletes are soft (`deletedAt`).
- No auth code: Cloudflare Access (2 emails) protects the Worker.
- Imports use the `#/` alias; new files are kebab-case.
- Tests are **not colocated**: they live in `src/tests/`, mirroring `src/` (e.g. `src/domain/derive.ts` → `src/tests/domain/derive.test.ts`) and import code via `#/`.
- For the component created by shadCn, remove the "use client" because we do not use nextjs

### File-based routing defining convention

- Only use flat routing (E.g: `dev.ui.tsx`)
- Directory-based routing only be used for layout!

## UI system

Hallmark **Cobalt** recoloured with the DTP logo palette (navy `oklch(35.6% 0.083 249)`, one blue signal accent). Fonts: Be Vietnam Pro (UI) + JetBrains Mono (labels/numbers); Tinos only inside drawings. All colours/fonts come from tokens (`src/tokens.css`, set up in P1) — no inline hex/OKLCH. Every interactive control ships all 8 states; Vietnamese needs body line-height ≥ 1.55. Details: `docs/super-plan.md` §3.

## Assets & private files

- `public/brand/*.webp` — served logo: DTP on drawings and in the app; `public/favicon.ico` = DTP. PNG/ICO masters (incl. unused E-TECH) live in `assets/brand/`.
- `.external/` is git-ignored: the reference DWG and `reference/` (two sample PDFs with real client names/addresses). Never move these into `public/` or commit them.

## Subagents (`.claude/agents/`)

`test-runner` after domain/drawing logic changes · `sheet-verifier` after sheet changes · `code-reviewer` before a phase's final commit · `symbol-extractor` for the DWG symbol library (P7).
