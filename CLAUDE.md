# Elevator drawing generator — project guide

Internal web app (1 user) that turns a parameter form into the A3 elevator construction drawing set (PDF) used by DTP. UI copy is 100% Vietnamese.

- Solution report (business rules, 14 confirmed decisions in §6): `docs/bao-cao-giai-phap-web-ban-ve-thang-may.md`
- Phase-by-phase plan with checkboxes — **update it as work lands**: `docs/super-plan.md`
- Intent skill loading for TanStack packages: @AGENTS.md

## Commands

Package manager is **yarn 1** — never run `npm install` / `pnpm` (no extra lockfiles).

- `yarn dev` (local D1 via the Cloudflare vite plugin) · `yarn build`
- `yarn typecheck` · `yarn lint` · `yarn test` — all must pass before a commit
- `yarn export:preset [hotel-9f|house-5f|all]` → `.verify/<preset>.pdf` via the running dev server's `/dev/export` and the local Chrome (playwright-core, no browser download); `EXPORT_BASE_URL` overrides `http://localhost:3000`
- `yarn db:generate` after editing `src/db/schema.ts`, then `yarn db:migrate:local`
- `yarn cf-typegen` after editing `wrangler.jsonc`
- shadcn components: `npx shadcn@latest add <name>`

## Architecture rules

- Data flow: form params → `src/domain/derive.ts` → `src/drawing/sheets/*` (pure `params → Prim[]`) → `render-svg` → preview **and** PDF (jsPDF + svg2pdf.js, in the browser). Never add a PDF-only drawing path.
- Sheet functions are pure: no React, DOM, fetch, `Date.now()` or randomness (seeded only). Units are mm; never hard-code sample-project numbers.
- SVG for drawings: no `<pattern>` (hatch = real lines + `clipPath`), no `<use>`/`<foreignObject>`; drawing text uses Tinos.
- Measure drawing text with `src/drawing/text-metrics.ts` (Tinos width table, regenerate with `yarn gen:font-metrics`), never canvas/DOM. Frame coordinates live in `src/drawing/frame/layout.ts`; company info in `src/config/company.ts`.
- Server: `createServerFn` in `src/server/`, D1 via `getDb()` from `src/db/index.ts`. Keep requests tiny (Workers free plan: 10 ms CPU). The editor route uses `ssr: false`.
- Project params are one JSON blob validated by Zod with `schemaVersion`; changing the shape needs a bump + `migrate` step. Deletes are soft (`deletedAt`).
- No auth code: Cloudflare Access protects the Worker (allowed emails are managed in the Cloudflare dashboard, not in the repo).
- Imports use the `#/` alias; new files are kebab-case.
- Tests are **not colocated**: they live in `src/tests/`, mirroring `src/` (e.g. `src/domain/derive.ts` → `src/tests/domain/derive.test.ts`) and import code via `#/`.
- For the component created by shadCn, remove the "use client" because we do not use nextjs

### File-based routing defining convention

- Only use flat routing (E.g: `dev.ui.tsx`)
- Directory-based routing only be used for layout!

## UI system

Hallmark **Cobalt** recoloured with the DTP logo palette (navy `oklch(35.6% 0.083 249)`, one blue signal accent). Fonts: Be Vietnam Pro (UI) + JetBrains Mono (labels/numbers); Tinos only inside drawings. All colours/fonts come from tokens (`src/tokens.css`, set up in P1) — no inline hex/OKLCH. Every interactive control ships all 8 states; Vietnamese needs body line-height ≥ 1.55. Details: `docs/super-plan.md` §3.

### Icons

- One icon set: **Lucide** (`lucide-react`). App code imports from `#/components/app/icons` (`Icons.create`, `Icons.delete`, …); add a new action there before using it. Sizes `size-4/5/6` only, default stroke, `currentColor`, `aria-label` on icon-only buttons. No other icon library, no emoji.

### Data tables

- Use **TanStack Table** (`@tanstack/react-table`, headless; load its Intent skill first) with `components/ui/table`. Don't hand-roll sort/filter logic.
- Search: debounce ~250 ms (`useDebouncedValue` in `src/lib/`), diacritic-insensitive (`đ`→`d`, strip marks), state in the URL search param `q`.
- Loading/UX: skeleton rows at real row height; keep old rows while refetching (`placeholderData`); per-row pending state on mutations; optimistic edit/delete; delete asks first (`AlertDialog`) and then still offers an Undo toast; inline error + "Thử lại"; separate empty vs no-match states.
- Row actions: ≥ 640 px icon buttons with `Tooltip` + `aria-label`; < 640 px one `Icons.more` menu (44 px). Edits go through a dialog — no inline cell editing.
- Responsive: `table-fixed` + explicit column widths ≥ 640 px; < 640 px render the same rows as a stacked list (44 px targets). Long Vietnamese names truncate with `min-w-0` + full name in `title`. No horizontal page scroll at 320 px, no nested scroll container, no `100vh` traps.
- List endpoints return only list columns (never the `params` blob) to stay under the 10 ms CPU budget.

### Editor (`src/features/editor/`)

- TanStack Form holds values only; validation is `collectIssues()` (Zod shape with Vietnamese messages + `checkRules`), keyed by dotted path. Bound fields live in `fields.tsx`; every control's DOM id is `fieldId(path)` (focus targets, aria wiring).
- Numbers use `NumberInput` (`components/ui/number-input.tsx`): blank/invalid → `NaN` (Zod error), `nullable` → `null`. Units go in the `Field` label.
- Autosave saves only Zod-valid params; rule errors block the PDF, not saving. Replace all values with `replaceParams` (never `form.reset` alone — `useForm` re-applies its `defaultValues` option whenever it differs from the form's and the form is untouched, which `reset` makes true).

### Accessibility

- `yarn lint` runs `eslint-plugin-jsx-a11y` (recommended) on `src/**/*.tsx`. Fix the markup; disable a rule only per line with `-- <reason>`. Radix controls are registered for `label-has-associated-control` in `eslint.config.js`.
- Anything clickable is a real `<button>` or `<a href>` (via `Button`/`Link`), never a clickable `div`/`svg`. Icon-only buttons have `aria-label` and a `Tooltip`.
- The pointer cursor comes from one rule in `src/styles.css`; don't add `cursor-*` classes (shadcn items that ship `cursor-default` get it removed).
- Destructive actions confirm with `AlertDialog` (focus lands on Cancel). After dialogs close or rows disappear, move focus somewhere sensible — never leave it on `body`.

## Assets & private files

- `public/brand/*.webp` — served logo: DTP on drawings and in the app; `public/favicon.ico` = DTP. PNG/ICO masters (incl. unused E-TECH) live in `assets/brand/`.
- `.external/` is git-ignored: the reference DWG and `reference/` (two sample PDFs with real client names/addresses). Never move these into `public/` or commit them.

## Subagents (`.claude/agents/`)

`test-runner` after domain/drawing logic changes · `sheet-verifier` after sheet changes · `code-reviewer` before a phase's final commit · `symbol-extractor` for the DWG symbol library (P7).
