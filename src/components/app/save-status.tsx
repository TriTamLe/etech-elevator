import { formatTime } from '#/lib/format'
import { cn } from '#/lib/utils'

export type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: Date }
  | { kind: 'error'; retry: () => void }
  /** Edited, waiting for the debounce. */
  | { kind: 'pending' }
  /** Not saved: the form has shape errors (blank or invalid numbers). */
  | { kind: 'invalid'; count: number }


// Silent-success status line in the mono label voice. aria-live so screen readers hear changes.
export function SaveStatus({
  state,
  className,
}: {
  state: SaveState
  className?: string
}) {
  return (
    <span
      aria-live="polite"
      className={cn('label-mono inline-flex items-center gap-2', className)}
    >
      {state.kind === 'pending' && (
        <span className="text-(--color-ink-3)">Chưa lưu…</span>
      )}
      {state.kind === 'invalid' && (
        <span className="text-(--color-danger)">
          Chưa lưu — còn {state.count} lỗi
        </span>
      )}
      {state.kind === 'saving' && (
        <span className="text-(--color-ink-3)">Đang lưu…</span>
      )}
      {state.kind === 'saved' && (
        <span className="text-(--color-ok)">
          Đã lưu {formatTime(state.at)}
        </span>
      )}
      {state.kind === 'error' && (
        <>
          <span className="text-(--color-danger)">Lưu lỗi</span>
          <button
            type="button"
            onClick={state.retry}
            className="label-mono text-(--color-accent) underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus)"
          >
            Thử lại
          </button>
        </>
      )}
    </span>
  )
}
