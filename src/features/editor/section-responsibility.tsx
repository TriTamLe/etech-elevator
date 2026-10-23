import { FieldRow, NumberField, TextField } from '#/features/editor/fields'

/** F. Hạng mục trách nhiệm */
export function SectionResponsibility() {
  return (
    <div className="grid gap-1">
      <FieldRow>
        <NumberField
          name="responsibility.widthTol"
          label="Sai lệch bề rộng (mỗi bên)"
        />
        <NumberField
          name="responsibility.plumbTol"
          label="Sai lệch trục đứng"
        />
      </FieldRow>
      <NumberField
        name="responsibility.pitDrill"
        label="Độ sâu khoan thử chống thấm pit"
      />
      <FieldRow>
        <TextField
          name="responsibility.breaker"
          label="CB tổng"
          placeholder="30 A"
        />
        <NumberField
          name="responsibility.spareLength"
          label="Chiều dài dây dư"
          unit="m"
          decimal
        />
      </FieldRow>
      <FieldRow>
        <TextField
          name="responsibility.powerCable"
          label="Dây động lực"
          placeholder="3 × 10 mm²"
        />
        <TextField
          name="responsibility.neutralCable"
          label="Dây trung hòa"
          placeholder="1 × 8 mm²"
        />
      </FieldRow>
      <TextField
        name="responsibility.note"
        label="Ghi chú thêm"
        hint="In ở cuối trang DTP 01."
        multiline
      />
    </div>
  )
}
