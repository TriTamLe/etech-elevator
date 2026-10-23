import { hookPosition } from '#/domain/derive'
import { useEditor } from '#/features/editor/editor-context'
import {
  FieldRow,
  NumberField,
  SelectField,
  TextField,
} from '#/features/editor/fields'
import { MACHINE_SUPPORT_OPTIONS } from '#/features/editor/options'

/** E. Buồng trên cùng / phòng máy / móc treo */
export function SectionTopRoom() {
  const { issues } = useEditor()
  const centre = issues.params ? hookPosition(issues.params) : null
  return (
    <div className="grid gap-1">
      <TextField
        name="topRoom.name"
        label="Tên buồng trên cùng"
        required
        placeholder="PHÒNG KỸ THUẬT"
      />
      <FieldRow>
        <NumberField name="topRoom.cpm.w" label="Cửa phòng máy CPM – rộng" />
        <NumberField name="topRoom.cpm.h" label="CPM – cao" />
      </FieldRow>
      <SelectField
        name="topRoom.machineSupport"
        label="Kiểu đỡ máy"
        options={MACHINE_SUPPORT_OPTIONS}
      />
      <NumberField
        name="topRoom.hook.loadTon"
        label="Móc treo – tải trọng"
        unit="tấn"
        decimal
      />
      <FieldRow>
        <NumberField
          name="topRoom.hook.x"
          label="Móc treo – cách tường trái"
          nullable
          placeholder={centre ? String(centre.x) : undefined}
          hint="Trống = tâm hố"
        />
        <NumberField
          name="topRoom.hook.y"
          label="Móc treo – cách tường trước"
          nullable
          placeholder={centre ? String(centre.y) : undefined}
          hint="Trống = tâm hố"
        />
      </FieldRow>
      <FieldRow cols={3}>
        <NumberField name="topRoom.hoistDetail.bar" label="Móc palăng Ø thép" />
        <NumberField name="topRoom.hoistDetail.a" label="Kích thước a" />
        <NumberField name="topRoom.hoistDetail.b" label="Kích thước b" />
      </FieldRow>
    </div>
  )
}
