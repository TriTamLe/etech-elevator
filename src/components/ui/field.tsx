import * as React from 'react'
import { AlertTriangleIcon, CheckIcon, Loader2Icon } from 'lucide-react'

import { cn } from '#/lib/utils'

type FieldStatus = 'idle' | 'loading' | 'success'

/** Props Field wires onto the interactive control. */
type ControlProps = {
  id: string
  'aria-invalid'?: true
  'aria-required'?: true
  'aria-describedby'?: string
  'data-status'?: 'success'
}

type FieldProps = {
  label: string
  /** Optional unit shown after the label in mono, e.g. "mm". */
  unit?: string
  hint?: string
  /** Replaces the hint in the same slot, sets aria-invalid on the control. */
  error?: string
  status?: FieldStatus
  required?: boolean
  /** Hide the right-edge glyph (e.g. Select already shows a chevron there). */
  showStatusIcon?: boolean
  className?: string
  /**
   * Either the interactive element itself (Input, Textarea…) — props are merged in —
   * or a render function for composites like Select, which must spread
   * the props onto the element that receives focus (SelectTrigger).
   */
  children:
    | React.ReactElement<Record<string, unknown>>
    | ((props: ControlProps) => React.ReactNode)
}

// Label above · control · one-line message slot that never collapses (no layout jump on error).
function Field({
  label,
  unit,
  hint,
  error,
  status = 'idle',
  required,
  showStatusIcon = true,
  className,
  children,
}: FieldProps) {
  const autoId = React.useId()
  const childProps = typeof children === 'function' ? undefined : children.props
  const id = (childProps?.id as string | undefined) ?? autoId
  const messageId = `${id}-message`
  const message = error ?? hint
  const invalid = Boolean(error)

  // Only add keys that carry a value: Radix spreads user props after its own
  // data-state / aria-* attributes, so an explicit `undefined` would erase them.
  const controlProps: ControlProps = { id }
  if (invalid) controlProps['aria-invalid'] = true
  if (required) controlProps['aria-required'] = true
  if (!invalid && status === 'success') controlProps['data-status'] = 'success'
  if (message) {
    const existing = childProps?.['aria-describedby'] as string | undefined
    controlProps['aria-describedby'] = existing
      ? `${existing} ${messageId}`
      : messageId
  }

  const control =
    typeof children === 'function'
      ? children(controlProps)
      : React.cloneElement(children, controlProps)

  return (
    <div data-slot="field" className={cn('grid gap-1', className)}>
      <label
        htmlFor={id}
        className="flex items-baseline gap-2 text-(length:--text-sm) font-medium text-(--color-ink)"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="text-(--color-danger)">
            *
          </span>
        )}
        {unit && (
          <span className="label-mono text-(--color-ink-3) normal-case">
            {unit}
          </span>
        )}
      </label>
      <div className="relative">
        {control}
        {showStatusIcon && (
          // Pinned to the first control row so it sits right for inputs and textareas alike.
          <span className="pointer-events-none absolute top-0 right-3 grid h-(--control-h) place-items-center">
            {invalid ? (
              <AlertTriangleIcon
                className="size-4 text-(--color-danger)"
                aria-hidden="true"
              />
            ) : status === 'loading' ? (
              <Loader2Icon
                className="size-4 animate-spin text-(--color-ink-3)"
                aria-hidden="true"
              />
            ) : status === 'success' ? (
              <CheckIcon
                className="size-4 text-(--color-ok)"
                aria-hidden="true"
              />
            ) : null}
          </span>
        )}
      </div>
      <p
        id={messageId}
        className={cn(
          'min-h-[1lh] text-(length:--text-xs)',
          invalid ? 'text-(--color-danger)' : 'text-(--color-ink-3)',
        )}
      >
        {message}
      </p>
    </div>
  )
}

export { Field }
export type { FieldStatus, ControlProps }
