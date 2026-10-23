/** Graphite light box that will hold the A3 preview (P5). */
export function PreviewPlaceholder() {
  return (
    <div className="grid h-full min-h-80 place-items-center bg-(--color-graphite) p-6">
      <div className="grid w-full max-w-2xl justify-items-center gap-3">
        <div className="grid aspect-420/297 w-full place-items-center rounded-sm bg-(--color-paper)/95">
          <p className="max-w-xs text-center text-(length:--text-sm) text-(--color-ink-3)">
            Bản xem trước tờ A3 sắp có.
          </p>
        </div>
        <p className="label-mono text-(--color-paper)">A3 · 420 × 297</p>
      </div>
    </div>
  )
}
