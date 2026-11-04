import { Icons } from '#/components/app/icons'
import { OFFLINE_TEXT } from '#/config/app'
import { useOnline } from '#/lib/use-online'
import { cn } from '#/lib/utils'

/** Shown only while offline: edits keep going, saves wait for the network. */
export function OfflineBanner({ className }: { className?: string }) {
  const online = useOnline()
  return (
    <div role="status" className={cn(online && 'sr-only', className)}>
      {!online && (
        <p className="flex items-center gap-2 border-b border-(--color-rule) bg-(--color-warn-soft) px-4 py-2 text-(length:--text-sm) text-(--color-ink) sm:px-6">
          <Icons.offline className="size-4 shrink-0" aria-hidden="true" />
          {OFFLINE_TEXT.banner}
        </p>
      )}
    </div>
  )
}
