import * as React from 'react'

import { Input } from '#/components/ui/input'
import { formatNumberText, parseNumberText } from '#/lib/number-text'
import { cn } from '#/lib/utils'

// Number entry that keeps what the user typed (so "15" on the way to "1500" is not
// rewritten) and reports a number upward: NaN when blank/invalid lets Zod show
// "Nhập một số.", or null when `nullable` (blank = not entered, e.g. floor height).
// Text is read the Vietnamese way ("1.500" = 1500, "2,5"): see lib/number-text.ts.
// The unit ("mm", "kg") belongs to the Field label, not the input.

type NumberInputProps = Omit<
  React.ComponentProps<'input'>,
  'value' | 'onChange' | 'type' | 'inputMode'
> & {
  value: number | null
  onValueChange: (value: number | null) => void
  /** Blank means "not entered" and reports null instead of NaN. */
  nullable?: boolean
  /** Allow a decimal part ("2,5", or "2.5"), shown with a comma; e.g. speed or hook load. */
  decimal?: boolean
}

function NumberInput({
  value,
  onValueChange,
  nullable = false,
  decimal = false,
  className,
  ...props
}: NumberInputProps) {
  const [text, setText] = React.useState(() => formatNumberText(value, decimal))
  // A value we did not just emit came from outside (reset, restored version): show it.
  const [seen, setSeen] = React.useState(value)
  if (!Object.is(value, seen)) {
    setSeen(value)
    if (!Object.is(value, parseNumberText(text, decimal)))
      setText(formatNumberText(value, decimal))
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
          nullable && next.trim() === ''
            ? null
            : parseNumberText(next, decimal),
        )
      }}
      className={cn('font-mono', className)}
    />
  )
}

export { NumberInput }
export type { NumberInputProps }
