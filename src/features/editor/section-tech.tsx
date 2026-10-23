import * as React from 'react'

import { Field } from '#/components/ui/field'
import { NumberInput } from '#/components/ui/number-input'
import { fieldId, useEditor } from '#/features/editor/editor-context'
import {
  FieldRow,
  NumberField,
  SelectField,
  TextField,
} from '#/features/editor/fields'
import { DOOR_TYPE_OPTIONS, LIFT_TYPE_OPTIONS } from '#/features/editor/options'
import {
  MAX_STOPS,
  MIN_STOPS,
  useStopsControl,
} from '#/features/editor/use-stops-control'

/** B. Đặc tính kỹ thuật */
export function SectionTech() {
  return (
    <div className="grid gap-1">
      <SelectField
        name="tech.liftType"
        label="Loại thang"
        options={LIFT_TYPE_OPTIONS}
      />
      <TextField
        name="tech.modelCode"
        label="Mã hiệu thang"
        hint="Chữ tự do, không tự sinh."
        placeholder="MRL - 550 - CO60 - 5/5"
      />
      <NumberField name="tech.loadKg" label="Tải trọng" unit="kg" />
      <FieldRow>
        <NumberField name="tech.shaft.width" label="Hố thang AH" />
        <NumberField name="tech.shaft.depth" label="Hố thang BH" />
      </FieldRow>
      <FieldRow cols={3}>
        <NumberField name="tech.car.width" label="Cabin CW" />
        <NumberField name="tech.car.depth" label="Cabin CD" />
        <NumberField name="tech.car.height" label="Cabin CH" />
      </FieldRow>
      <FieldRow>
        <NumberField name="tech.door.width" label="Cửa OP" />
        <NumberField name="tech.door.height" label="Cửa HH" />
      </FieldRow>
      <SelectField
        name="tech.door.type"
        label="Kiểu mở cửa"
        options={DOOR_TYPE_OPTIONS}
      />
      <FieldRow>
        <StopsField />
        <NumberField name="tech.doors" label="Số cửa" unit="cửa" />
      </FieldRow>
      <NumberField name="tech.speed" label="Tốc độ" unit="m/phút" decimal />
      <FieldRow>
        <TextField
          name="tech.machine"
          label="Máy kéo"
          placeholder="MONTANARI"
        />
        <TextField
          name="tech.controller"
          label="Tủ điều khiển"
          placeholder="STEP"
        />
      </FieldRow>
      <FieldRow cols={3}>
        <NumberField name="tech.pit" label="PIT" />
        <NumberField name="tech.overhead" label="OH" />
        <NumberField name="tech.topRoomHeight" label="Buồng trên cùng" />
      </FieldRow>
      <TextField
        name="tech.mainPower"
        label="Nguồn điện chính"
        placeholder="AC 380V 50Hz 3 Phase"
      />
      <TextField
        name="tech.lightPower"
        label="Nguồn điện đèn"
        placeholder="AC 220V 50Hz 1 Phase"
      />
    </div>
  )
}

/**
 * Stop count drives the floor list. Applied on blur / Enter (not per keystroke, so typing
 * "12" never passes through 1); useStopsControl asks first when edited rows would go.
 */
function StopsField() {
  const { issues } = useEditor()
  const { stops, request, dialog } = useStopsControl()
  const [draft, setDraft] = React.useState<number | null>(stops)
  // Restored version / imported JSON / section D buttons changed the count: show it.
  const [seen, setSeen] = React.useState(stops)
  if (stops !== seen) {
    setSeen(stops)
    setDraft(stops)
  }
  const key = 'tech.stops'
  const error = issues.byPath
    .get(key)
    ?.find((i) => i.level === 'error')?.message
  const invalid = draft === null || !Number.isInteger(draft)
  const outOfRange = !invalid && (draft < MIN_STOPS || draft > MAX_STOPS)

  const commit = () => {
    // Leaving the box with a blank / bad / out-of-range value puts the real count back,
    // so the box never shows a number the form does not hold.
    if (invalid || outOfRange) {
      setDraft(stops)
      return
    }
    request({
      to: draft,
      returnFocusId: fieldId(key),
      onCancel: () => setDraft(stops),
    })
  }

  return (
    <>
      <Field
        label="Số điểm dừng"
        unit="tầng"
        required
        error={
          invalid
            ? 'Nhập một số (rời ô sẽ trả về số cũ).'
            : outOfRange
              ? `Từ ${MIN_STOPS} đến ${MAX_STOPS} điểm dừng.`
              : error
        }
        hint="Danh sách tầng ở mục D đổi theo."
      >
        <NumberInput
          id={fieldId(key)}
          value={draft}
          onValueChange={setDraft}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
          }}
        />
      </Field>
      {dialog}
    </>
  )
}
