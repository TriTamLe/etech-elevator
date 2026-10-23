import type { DeepKeys } from '@tanstack/react-form'

import { Field } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { NumberInput } from '#/components/ui/number-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Switch } from '#/components/ui/switch'
import { Textarea } from '#/components/ui/textarea'
import type { ElevatorParams } from '#/domain/schema'
import { fieldId, useEditor } from '#/features/editor/editor-context'
import { fieldKey } from '#/features/editor/issues'
import { cn } from '#/lib/utils'

// Form fields bound to one path of ElevatorParams. Each shows the first error (or warning)
// collectIssues() reported for that path, and uses the path as its DOM id.

export type FieldName = DeepKeys<ElevatorParams>

type Common = {
  name: FieldName
  label: string
  hint?: string
  required?: boolean
  className?: string
}

function useMessages(name: string) {
  const { issues } = useEditor()
  const key = fieldKey(name)
  const list = issues.byPath.get(key) ?? []
  return {
    key,
    error: list.find((i) => i.level === 'error')?.message,
    warning: list.find((i) => i.level === 'warning')?.message,
  }
}

export function TextField({
  name,
  label,
  hint,
  required,
  className,
  multiline,
  placeholder,
  maxLength,
}: Common & { multiline?: boolean; placeholder?: string; maxLength?: number }) {
  const { form } = useEditor()
  const { key, error, warning } = useMessages(name)
  return (
    <form.Field name={name}>
      {(field) => {
        const props = {
          id: fieldId(key),
          value: (field.state.value as string | undefined) ?? '',
          placeholder,
          maxLength,
          onBlur: field.handleBlur,
        }
        return (
          <Field
            label={label}
            hint={hint}
            error={error}
            warning={warning}
            required={required}
            className={className}
          >
            {multiline ? (
              <Textarea
                {...props}
                rows={3}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            ) : (
              <Input
                {...props}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            )}
          </Field>
        )
      }}
    </form.Field>
  )
}

export function NumberField({
  name,
  label,
  hint,
  required = true,
  className,
  unit = 'mm',
  nullable,
  decimal,
  placeholder,
  disabled,
}: Common & {
  unit?: string
  nullable?: boolean
  decimal?: boolean
  placeholder?: string
  disabled?: boolean
}) {
  const { form } = useEditor()
  const { key, error, warning } = useMessages(name)
  return (
    <form.Field name={name}>
      {(field) => (
        <Field
          label={label}
          unit={unit}
          hint={hint}
          error={error}
          warning={warning}
          required={required && !nullable}
          className={className}
        >
          <NumberInput
            id={fieldId(key)}
            value={field.state.value as number | null}
            nullable={nullable}
            decimal={decimal}
            placeholder={placeholder}
            disabled={disabled}
            onBlur={field.handleBlur}
            onValueChange={(v) => field.handleChange(v)}
          />
        </Field>
      )}
    </form.Field>
  )
}

export function SelectField<T extends string>({
  name,
  label,
  hint,
  className,
  options,
}: Common & { options: ReadonlyArray<readonly [T, string]> }) {
  const { form } = useEditor()
  const { key, error, warning } = useMessages(name)
  return (
    <form.Field name={name}>
      {(field) => (
        <Field
          label={label}
          hint={hint}
          error={error}
          warning={warning}
          showStatusIcon={false}
          className={className}
        >
          {(controlProps) => (
            <Select
              value={field.state.value as string}
              onValueChange={(v) => field.handleChange(v)}
            >
              <SelectTrigger {...controlProps} id={fieldId(key)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map(([value, text]) => (
                  <SelectItem key={value} value={value}>
                    {text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      )}
    </form.Field>
  )
}

export function SwitchField({ name, label, hint, className }: Common) {
  const { form } = useEditor()
  const { key } = useMessages(name)
  return (
    <form.Field name={name}>
      {(field) => (
        <div className={cn('grid gap-1', className)}>
          <label className="flex items-center justify-between gap-3 text-(length:--text-sm) font-medium text-(--color-ink)">
            {label}
            <Switch
              id={fieldId(key)}
              checked={field.state.value as boolean}
              onCheckedChange={(v) => field.handleChange(v)}
            />
          </label>
          {hint && (
            <p className="text-(length:--text-xs) text-(--color-ink-3)">
              {hint}
            </p>
          )}
        </div>
      )}
    </form.Field>
  )
}

/** Two or three fields on one row (AH × BH, W × H…), stacking on very narrow screens. */
export function FieldRow({
  children,
  cols = 2,
}: {
  children: React.ReactNode
  cols?: 2 | 3
}) {
  return (
    <div
      className={cn(
        // items-end: a label that wraps to two lines must not push its input out of line.
        'grid items-end gap-x-3',
        cols === 2 ? 'grid-cols-2' : 'grid-cols-2 min-[400px]:grid-cols-3',
      )}
    >
      {children}
    </div>
  )
}
