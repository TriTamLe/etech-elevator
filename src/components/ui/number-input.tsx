import * as React from 'react'

import { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils'

// Number entry that keeps what the user typed (so "15" on the way to "1500" is not
// rewritten) and reports a number upward: NaN when blank/invalid lets Zod show
// "Nhập một số.", or null when `nullable` (blank = not entered, e.g. floor height).
// The unit ("mm", "kg") belongs to the Field label, not the input.

type NumberInputProps = Omit<
  React.ComponentProps<'input'>,
  'value' | 'onChange' | 'type' | 'inputMode'
> & {
  value: number | null
  onValueChange: (value: number | null) => void
  /** Blank means "not entered" and reports null instead of NaN. */
  nullable?: boolean
  /** Allow a decimal part (comma or dot), e.g. speed or hook load. */
  decimal?: boolean
}

function format(value: number | null): string {
  return value === null || Number.isNaN(value) ? '' : String(value)
}

function parse(text: string, decimal: boolean): number {
  const t = text.trim().replace(',', '.')
  const ok = decimal ? /^\d+(\.\d+)?$/.test(t) : /^\d+$/.test(t)
  return ok ? Number(t) : Number.NaN
}

function NumberInput({
  value,
  onValueChange,
  nullable = false,
  decimal = false,
  className,
  ...props
}: NumberInputProps) {
  const [text, setText] = React.useState(() => format(value))
  // A value we did not just emit came from outside (reset, restored version): show it.
  const [seen, setSeen] = React.useState(value)
  if (!Object.is(value, seen)) {
    setSeen(value)
    if (!Object.is(value, parse(text, decimal))) setText(format(value))
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      autoComplete="off"
      value={text}
      onChange={(e) => {
        const next = e.target.value
        setText(next)
        onValueChange(
          nullable && next.trim() === '' ? null : parse(next, decimal),
        )
      }}
      className={cn('font-mono', className)}
    />
  )
}

export { NumberInput }
export type { NumberInputProps }
