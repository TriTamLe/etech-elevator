import { FieldRow, NumberField, SwitchField } from '#/features/editor/fields'

/** C. Kết cấu hố & cửa tầng */
export function SectionStructure() {
  return (
    <div className="grid gap-1">
      <NumberField name="structure.wall" label="Chiều dày tường hố" />
      <FieldRow>
        <NumberField
          name="structure.ringBeamTop.w"
          label="Dầm kiềng mái – rộng"
        />
        <NumberField
          name="structure.ringBeamTop.h"
          label="Dầm kiềng mái – cao"
        />
      </FieldRow>
      <FieldRow>
        <NumberField
          name="structure.ringBeamFloor.w"
          label="Dầm kiềng tầng – rộng"
        />
        <NumberField
          name="structure.ringBeamFloor.h"
          label="Dầm kiềng tầng – cao"
        />
      </FieldRow>
      <FieldRow>
        <NumberField
          name="structure.doorHeadBeam.w"
          label="Dầm đầu cửa – rộng"
        />
        <NumberField
          name="structure.doorHeadBeam.h"
          label="Dầm đầu cửa – cao"
        />
      </FieldRow>
      <FieldRow>
        <NumberField name="structure.midBeam.w" label="Đà giữa tầng – rộng" />
        <NumberField name="structure.midBeam.h" label="Đà giữa tầng – cao" />
      </FieldRow>
      <FieldRow>
        <NumberField
          name="structure.midBeam.spacingTop"
          label="Khoảng cách đà (tầng trên cùng)"
        />
        <NumberField
          name="structure.midBeam.spacing"
          label="Khoảng cách đà (các tầng)"
        />
      </FieldRow>
      <FieldRow>
        <NumberField
          name="structure.roughOpeningHeight"
          label="Cao lỗ chờ cửa thô"
        />
        <NumberField name="structure.lintel" label="Lanh tô" />
      </FieldRow>
      <FieldRow cols={3}>
        <NumberField name="structure.callBox.w" label="Hộp gọi – rộng" />
        <NumberField name="structure.callBox.h" label="Hộp gọi – cao" />
        <NumberField name="structure.callBox.bottom" label="Cao độ đáy" />
      </FieldRow>
      <SwitchField
        name="structure.infillNote"
        label="Ghi chú “Xây chèn sau khi lắp xong cửa”"
        hint="In trên mặt cắt ngang (DTP 03)."
      />
    </div>
  )
}
