import { PROJECT_TEXT_MAX, TITLE_BLOCK_PART_DEFAULT } from '#/domain/config'
import { pageList, suggestedCategory } from '#/domain/derive'
import { useEditor } from '#/features/editor/editor-context'
import {
  FieldRow,
  NumberField,
  SelectField,
  TextField,
} from '#/features/editor/fields'
import type { FieldName } from '#/features/editor/fields'
import { DOC_TYPE_OPTIONS } from '#/features/editor/options'

/** A. Thông tin hồ sơ */
export function SectionProject() {
  const { issues } = useEditor()
  const params = issues.params
  return (
    <div className="grid gap-1">
      <TextField
        name="project.name"
        label="Tên công trình"
        required
        maxLength={PROJECT_TEXT_MAX.name}
      />
      <TextField
        name="project.address"
        label="Địa chỉ đầy đủ"
        hint="In trên trang bìa."
        maxLength={PROJECT_TEXT_MAX.address}
      />
      <TextField
        name="project.shortAddress"
        label="Địa chỉ rút gọn"
        hint="In trong khung tên. Để trống thì dùng địa chỉ đầy đủ."
      />
      <TextField
        name="project.category"
        label="Hạng mục (trang bìa)"
        placeholder={params ? suggestedCategory(params) : undefined}
        hint="Để trống thì dùng gợi ý theo tải trọng và số lượng."
      />
      <TextField
        name="project.titleBlockPart"
        label="Hạng mục (khung tên)"
        placeholder={TITLE_BLOCK_PART_DEFAULT}
        hint={`In trong khung tên ở mọi trang. Để trống thì in “${TITLE_BLOCK_PART_DEFAULT}”.`}
      />
      <FieldRow>
        <NumberField name="project.quantity" label="Số lượng" unit="thang" />
        <TextField
          name="project.issueMonth"
          label="Tháng phát hành"
          placeholder="10/2026"
        />
      </FieldRow>
      <TextField
        name="project.issuePlace"
        label="Nơi phát hành"
        placeholder="Đà Nẵng"
      />
      <SelectField
        name="project.docType"
        label="Loại hồ sơ"
        hint="Đánh dấu trong ô “Loại hồ sơ” của khung tên ở mọi trang."
        options={DOC_TYPE_OPTIONS}
      />
      <TextField name="project.designer" label="Thiết kế" />
      <FieldRow>
        <TextField name="project.checker" label="Kiểm tra" />
        <TextField name="project.approver" label="Duyệt" />
      </FieldRow>
      <FieldRow>
        <TextField
          name="project.completedDate"
          label="Ngày hoàn thành"
          placeholder="22/10/2026"
        />
        <TextField name="project.revisionNo" label="Số hiệu chỉnh" />
      </FieldRow>

      {/* Always mounted (only its rows need valid params), so it keeps its open state. */}
      <details className="group rounded-(--radius-control) border border-(--color-rule)">
        <summary className="flex items-center justify-between px-3 py-2 text-(length:--text-sm) font-medium text-(--color-ink) focus-visible:outline-2 focus-visible:outline-(--color-focus)">
          Ghi đè theo trang
          <span className="label-mono text-(--color-ink-3)">
            {/* Shown only while collapsed */}
            <span className="group-open:hidden">Mở</span>
            <span className="hidden group-open:inline">Thu gọn</span>
          </span>
        </summary>
        <div className="grid gap-3 border-t border-(--color-rule) p-3">
          <p className="text-(length:--text-xs) text-(--color-ink-3)">
            Để trống thì trang dùng ngày hoàn thành và số hiệu chỉnh chung ở
            trên.
          </p>
          {!params && (
            <p className="text-(length:--text-xs) text-(--color-ink-3)">
              Sửa các lỗi trong form để xem danh sách trang.
            </p>
          )}
          {(params ? pageList(params) : [])
            .filter((page) => page.key !== 'cover')
            .map((page) => (
              <div key={page.key} className="grid gap-1">
                <p className="label-mono text-(--color-ink-2)">
                  {page.code} · {page.title}
                </p>
                <FieldRow>
                  <TextField
                    name={
                      `project.pageOverrides.${page.key}.completedDate` as FieldName
                    }
                    label="Ngày hoàn thành"
                  />
                  <TextField
                    name={
                      `project.pageOverrides.${page.key}.revisionNo` as FieldName
                    }
                    label="Số hiệu chỉnh"
                  />
                </FieldRow>
              </div>
            ))}
        </div>
      </details>
    </div>
  )
}
