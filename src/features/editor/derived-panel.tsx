import { jambLabelInline } from '#/domain/config'
import { derive } from '#/domain/derive'
import type { JambType } from '#/domain/schema'
import { useEditor } from '#/features/editor/editor-context'

const mm = new Intl.NumberFormat('vi-VN')

/**
 * "Tự tính": read-only values the sheets will print, straight from derive(). Label above
 * value, so long Vietnamese labels never squeeze the numbers. The page list lives in the
 * preview (P5), where it doubles as page navigation.
 */
export function DerivedPanel() {
  const { issues } = useEditor()
  const d = issues.params ? derive(issues.params) : null

  return (
    <section
      aria-labelledby="derived-title"
      className="rounded-(--radius-card) border border-(--color-rule) bg-(--color-paper-2) p-4"
    >
      <h2 id="derived-title" className="label-mono text-(--color-ink-2)">
        Tự tính (chỉ đọc)
      </h2>
      {!d ? (
        <p className="mt-2 text-(length:--text-sm) text-(--color-ink-3)">
          Sửa các lỗi trong form để xem giá trị tự tính.
        </p>
      ) : (
        <dl className="mt-3 grid gap-3 text-(length:--text-sm)">
          <Item
            label="Tổng chiều cao hố"
            value={
              d.shaftTotalHeight === null
                ? '-- mm (chưa đủ chiều cao tầng)'
                : `${mm.format(d.shaftTotalHeight)} mm`
            }
          />
          {Object.entries(d.openings).map(([jamb, o]) => (
            <Item
              key={jamb}
              label={`Lỗ chờ ${jambLabelInline(jamb as JambType)}`}
              value={`${o.width} mm · mỗi bên ${o.side} mm`}
            />
          ))}
          <Item
            label="Móc treo (cách tường trái / trước)"
            value={`${d.hook.x} / ${d.hook.y} mm`}
          />
          <Item
            label="Nhóm tầng trên mặt cắt đứng"
            value={d.floorGroups.map((g) => g.label).join(' · ')}
          />
        </dl>
      )}
    </section>
  )
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-(--color-ink-3)">{label}</dt>
      <dd className="font-mono text-(--color-ink)">{value}</dd>
    </div>
  )
}
