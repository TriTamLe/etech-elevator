import { useStore } from '@tanstack/react-form'

import { Icons } from '#/components/app/icons'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { NumberInput } from '#/components/ui/number-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import type { JambType } from '#/domain/schema'
import {
  fieldId,
  focusLater,
  useEditor,
} from '#/features/editor/editor-context'
import { JAMB_TYPE_OPTIONS } from '#/features/editor/options'
import {
  MAX_STOPS,
  MIN_STOPS,
  useStopsControl,
} from '#/features/editor/use-stops-control'
import { cn } from '#/lib/utils'

const SHORT_JAMB: Record<JambType, string> = { wide: 'Rộng', narrow: 'Hẹp' }
// Fits a 320 px screen: name · height (flex) · jamb · door.
const COLS =
  'grid grid-cols-[3.5rem_minmax(0,1fr)_5.5rem_2.25rem] items-start gap-1.5 sm:grid-cols-[4.5rem_minmax(0,1fr)_6.5rem_2.75rem] sm:gap-2'

const ADD_ID = 'floors-add'
const REMOVE_ID = 'floors-remove'

/** D. Danh sách tầng — one row per stop, top floor first; add/remove at the top. */
export function SectionFloors() {
  const { form, issues } = useEditor()
  const count = useStore(form.store, (s) => s.values.floors.length)
  const listError = issues.byPath.get('floors')?.[0]?.message
  const { stops, request, dialog } = useStopsControl()

  const add = () => {
    request({ to: stops + 1, returnFocusId: ADD_ID })
    // The new top floor's name: the row the user most likely wants to edit next.
    focusLater(fieldId(`floors.${stops}.name`), ADD_ID)
  }
  const remove = () => {
    // At the minimum the remove button is disabled: return focus to "Thêm tầng" instead.
    const back = stops - 1 <= MIN_STOPS ? ADD_ID : REMOVE_ID
    if (request({ to: stops - 1, returnFocusId: back })) focusLater(back)
  }

  return (
    <div className="grid gap-2">
      <p className="text-(length:--text-xs) text-(--color-ink-3)">
        Thêm/bớt tầng ở đây hoặc sửa số điểm dừng ở mục B. Chiều cao (mm) dùng
        cho bảng chiều cao tầng và tổng chiều cao hố; trên mặt cắt đứng luôn ghi
        “THEO THỰC TẾ”. Tầng trên cùng (OH) không nhập chiều cao: dòng của nó =
        OH + chiều cao buồng trên cùng.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          id={ADD_ID}
          variant="outline"
          size="sm"
          disabled={stops >= MAX_STOPS}
          onClick={add}
        >
          <Icons.create aria-hidden="true" />
          Thêm tầng
        </Button>
        <Button
          id={REMOVE_ID}
          variant="ghost"
          size="sm"
          disabled={stops <= MIN_STOPS}
          onClick={remove}
        >
          <Icons.remove aria-hidden="true" />
          Bớt tầng trên cùng
        </Button>
      </div>
      {dialog}
      {listError && (
        <p
          id={fieldId('floors')}
          className="text-(length:--text-xs) text-(--color-danger)"
        >
          {listError}
        </p>
      )}
      <div
        className={cn(COLS, 'label-mono text-(--color-ink-3)')}
        aria-hidden="true"
      >
        <span>Tầng</span>
        <span>Cao</span>
        <span>Bao che</span>
        <span className="text-center">Cửa</span>
      </div>
      {/* Shown top floor first; `reversed` keeps list numbers matching 1F = 1. */}
      <ol reversed className="grid gap-2">
        {Array.from({ length: count }, (_, i) => count - 1 - i).map((i) => (
          <FloorRow key={i} index={i} isTop={i === count - 1} />
        ))}
      </ol>
    </div>
  )
}

function FloorRow({ index, isTop }: { index: number; isTop: boolean }) {
  const { form, issues } = useEditor()
  const base = `floors.${index}`
  const err = (k: string) =>
    issues.byPath.get(`${base}.${k}`)?.find((x) => x.level === 'error')?.message
  const messages = [err('name'), err('height')].filter(Boolean)
  const messageId = `${fieldId(base)}-message`
  const described = messages.length > 0 ? messageId : undefined
  const which = `tầng thứ ${index + 1}`

  return (
    <li className="grid gap-1">
      <div className={COLS}>
        <form.Field name={`floors[${index}].name`}>
          {(field) => (
            <Input
              id={fieldId(`${base}.name`)}
              aria-label={`Tên ${which}`}
              aria-invalid={err('name') ? true : undefined}
              aria-describedby={described}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              className="pr-2 font-mono"
            />
          )}
        </form.Field>
        {isTop ? (
          <p
            className="flex h-(--control-h) items-center font-mono text-(--color-ink-3)"
            title="OH + chiều cao buồng trên cùng"
          >
            OH
          </p>
        ) : (
          <form.Field name={`floors[${index}].height`}>
            {(field) => (
              <NumberInput
                id={fieldId(`${base}.height`)}
                aria-label={`Chiều cao ${which} (mm)`}
                aria-invalid={err('height') ? true : undefined}
                aria-describedby={described}
                value={field.state.value}
                nullable
                placeholder="—"
                onBlur={field.handleBlur}
                onValueChange={(v) => field.handleChange(v)}
                className="pr-2"
              />
            )}
          </form.Field>
        )}
        <form.Field name={`floors[${index}].jamb`}>
          {(field) => (
            <Select
              value={field.state.value}
              onValueChange={(v) => field.handleChange(v as JambType)}
            >
              <SelectTrigger
                id={fieldId(`${base}.jamb`)}
                aria-label={`Bao che ${which}`}
                className="px-2"
              >
                <SelectValue>{SHORT_JAMB[field.state.value]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {JAMB_TYPE_OPTIONS.map(([value, text]) => (
                  <SelectItem key={value} value={value}>
                    {text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </form.Field>
        <form.Field name={`floors[${index}].hasDoor`}>
          {(field) => (
            <span className="grid h-(--control-h) place-items-center">
              <Checkbox
                id={fieldId(`${base}.hasDoor`)}
                aria-label={`Cửa tầng ở ${which}`}
                checked={field.state.value}
                onCheckedChange={(v) => field.handleChange(v === true)}
              />
            </span>
          )}
        </form.Field>
      </div>
      {messages.length > 0 && (
        <p
          id={messageId}
          className="text-(length:--text-xs) text-(--color-danger)"
        >
          {messages.join(' ')}
        </p>
      )}
    </li>
  )
}
