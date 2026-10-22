# Design — Bản vẽ thang máy

Locked design system. Future Hallmark runs read this file first; pages defer
to it. Amend intentionally — the file is the rule.

## System
- Genre · modern-minimal
- Macrostructure · Workbench (editor: form left · graphite lightbox right) · index list for `/`
- Theme · Cobalt, recoloured to the DTP logo (navy anchor, one DTP-blue signal)
- Axes · light (cool paper L 98.5 %) / grotesk-sans (Be Vietnam Pro) / cool blue (hue 245–249)
- Nav · N13 inline ⌘K search affordance (6 px radius, not a pill) · Footer · none (app)
- Copy · 100 % Vietnamese, specific verbs ("Tải PDF", "Lưu phiên bản", "Tạo dự án")

## Tokens (canonical · `src/tokens.css` is the source of truth)
```css
:root {
  --color-paper:       oklch(98.5% 0.004 249);
  --color-paper-2:     oklch(96.6% 0.006 249);
  --color-rule:        oklch(90.5% 0.010 249);   /* decorative hairline */
  --color-rule-strong: oklch(62% 0.020 249);     /* control boundary, ≥ 3:1 */
  --color-ink:         oklch(24% 0.035 249);
  --color-ink-2:       oklch(34% 0.030 249);
  --color-ink-3:       oklch(52% 0.020 249);
  --color-brand:       oklch(35.6% 0.083 249);   /* DTP navy */
  --color-accent:      oklch(52% 0.130 245);     /* the one signal */
  --color-accent-ink:  oklch(98.5% 0.004 249);
  --color-focus:       oklch(52% 0.130 245);
  --color-graphite:    oklch(23% 0.030 249);     /* preview lightbox, the one dark band */
  --color-ok:          oklch(50% 0.130 145);  --color-warn: oklch(79.9% 0.164 77);
  --color-danger:      oklch(55% 0.190 27);

  --font-display: "Be Vietnam Pro";  --font-body: "Be Vietnam Pro";
  --font-mono: "JetBrains Mono Variable";  --font-drawing: "Tinos";  /* drawings only */

  /* 4-pt space: --space-2xs … --space-3xl · type: --text-xs … --text-display  */
  /* leading: body 1.55 · heading 1.25 (Vietnamese stacked diacritics)        */

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast: 120ms;  --dur-base: 200ms;  --dur-slow: 320ms;
  --radius-control: 6px;  --radius-card: 10px;  --control-h: 40px (44px coarse);
}
```

## CTA voice
- Primary · solid `--color-accent` + `--color-accent-ink` · 6 px · one per screen
- Secondary · `outline` (rule-2 border on paper) or `ghost` · same radius
- States · default · hover · focus-visible (instant 2 px outline) · active (1 px press) · disabled (0.55) · loading (spinner keeps width) · error (aria-invalid) · success (data-state)

## Motion stance
- Near-silent: ⌘K palette fade + 8 px rise, link underline grow. No transition-all, no bounce.
- Reduced-motion fallback · durations collapse to 1 ms.

## Rules
- Colours/fonts only via tokens (Tailwind `bg-(--color-…)`); shadcn variables map onto them in `src/styles.css`.
- Hairlines, not shadows. Orange (warn) is status only, never an accent.
- Success is silent (status text), deletes offer Undo instead of confirm dialogs.

## Exports
`src/tokens.css` is the source of truth; shadcn/ui variables are mapped in
`src/styles.css` (`:root` + `@theme inline`). Ask for Tailwind `@theme` or DTCG
exports to extend this section.
