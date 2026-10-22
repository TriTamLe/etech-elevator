import { cn } from '#/lib/utils'

/** DTP logo (transparent WebP). Size it with a height class, e.g. `h-16`. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/dtp-logo.webp"
      alt="DTP Education Solutions"
      width={1298}
      height={663}
      className={cn('h-12 w-auto', className)}
    />
  )
}
