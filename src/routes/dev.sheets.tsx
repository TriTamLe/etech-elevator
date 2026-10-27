import * as React from 'react'
import { createFileRoute, notFound } from '@tanstack/react-router'

import { DOC_TYPES, DOC_TYPE_LABELS } from '#/domain/config'
import { derive } from '#/domain/derive'
import type { Page } from '#/domain/derive'
import { PRESETS } from '#/domain/presets'
import type { ElevatorParams } from '#/domain/schema'
import { renderPage } from '#/drawing/pages'
import { SheetSvg } from '#/drawing/render-svg'

// Dev-only gallery of sheets for checking the frame against the reference set by eye:
// each preset's cover + first framed sheet, then stress cases (long text, every doc type).

export const Route = createFileRoute('/dev/sheets')({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  ssr: false,
  component: DevSheets,
})

const LONG =
  'CÔNG TRÌNH THỬ NGHIỆM VỚI TÊN RẤT DÀI ĐỂ KIỂM TRA CO CHỮ – TRUNG TÂM THƯƠNG MẠI, KHÁCH SẠN VÀ CĂN HỘ DỊCH VỤ CAO CẤP BÊN BỜ SÔNG HÀN, PHƯỜNG HẢI CHÂU'

function stress(base: ElevatorParams): ElevatorParams {
  const p = structuredClone(base)
  p.project.name = LONG
  p.project.address = `${LONG}, SỐ 123 ĐƯỜNG BẠCH ĐẰNG, THÀNH PHỐ ĐÀ NẴNG, VIỆT NAM`
  p.project.shortAddress =
    'SỐ 123 ĐƯỜNG BẠCH ĐẰNG, PHƯỜNG HẢI CHÂU, THÀNH PHỐ ĐÀ NẴNG'
  p.project.approver = 'NGUYỄN THỊ PHƯƠNG THẢO NHƯ Ý'
  p.project.completedDate = '25/10/2026'
  p.project.revisionNo = '02'
  p.project.pageOverrides = { responsibility: { revisionNo: '03' } }
  p.revisions = [1, 2, 3].map((n) => ({
    detail: `Chi tiết ${n}`,
    change: `Đổi cửa tầng lần ${n} theo yêu cầu chủ đầu tư`,
    date: `0${n}/10/2026`,
    number: String(n),
    by: 'Trần Anh Vũ',
    checkedBy: 'Nguyễn Văn Phú',
    approvedBy: 'Lê Duy Khánh',
    requirement: 'Thay bao che hẹp bằng bao che rộng ở tầng 1F và 2F',
  }))
  return p
}

function withNote(base: ElevatorParams): ElevatorParams {
  const p = structuredClone(base)
  p.responsibility.note = Array.from(
    { length: 15 },
    (_, i) =>
      `${i + 1}. Ghi chú thêm số ${i + 1}: chủ đầu tư chuẩn bị mặt bằng tập kết vật tư và nguồn điện thi công tạm trước ngày lắp đặt.`,
  ).join('\n')
  return p
}

function longSpec(base: ElevatorParams): ElevatorParams {
  const p = structuredClone(base)
  p.floors[1].height = null
  p.tech.machine = 'MONTANARI GIOVANNI M83 – ITALY (KÈM BIẾN TẦN)'
  p.tech.controller = 'STEP AS380 – BẢN ĐẦY ĐỦ'
  p.tech.mainPower =
    'AC : 380V : 50Hz : 3Phase – có dây tiếp địa riêng cho tủ điều khiển'
  return p
}

type Sample = {
  title: string
  params: ElevatorParams
  page: (pages: Array<Page>) => Page
}

const SAMPLES: Array<Sample> = [
  ...PRESETS.flatMap((preset): Array<Sample> => [
    {
      title: `${preset.label} · Bìa`,
      params: preset.params,
      page: (ps) => ps[0],
    },
    {
      title: `${preset.label} · DTP 01`,
      params: preset.params,
      page: (ps) => ps[1],
    },
    {
      title: `${preset.label} · DTP 02`,
      params: preset.params,
      page: (ps) => ps[2],
    },
  ]),
  {
    title: 'Ghi chú 15 dòng · DTP 01',
    params: withNote(PRESETS[1].params),
    page: (ps) => ps[1],
  },
  {
    title: 'Thiếu chiều cao tầng, giá trị dài · DTP 02',
    params: longSpec(PRESETS[1].params),
    page: (ps) => ps[2],
  },
  {
    title: 'Chữ dài · Bìa',
    params: stress(PRESETS[0].params),
    page: (ps) => ps[0],
  },
  {
    title: 'Chữ dài · DTP 01',
    params: stress(PRESETS[0].params),
    page: (ps) => ps[1],
  },
  ...DOC_TYPES.map((t): Sample => ({
    title: `Loại hồ sơ: ${DOC_TYPE_LABELS[t]}`,
    params: {
      ...PRESETS[1].params,
      project: { ...PRESETS[1].params.project, docType: t },
    },
    page: (ps) => ps[2],
  })),
]

function DevSheets() {
  return (
    <main className="grid gap-8 bg-(--color-graphite) p-6">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-paper)">
        Bản vẽ mẫu (dev)
      </h1>
      {SAMPLES.map((s) => (
        <SampleSheet key={s.title} sample={s} />
      ))}
    </main>
  )
}

function SampleSheet({ sample }: { sample: Sample }) {
  const prims = React.useMemo(() => {
    const d = derive(sample.params)
    return renderPage(sample.params, d, sample.page(d.pages))
  }, [sample])
  return (
    <section className="grid gap-2" aria-label={sample.title}>
      <h2 className="label-mono text-(--color-paper)">{sample.title}</h2>
      <SheetSvg
        prims={prims}
        label={sample.title}
        className="h-auto w-full max-w-[1600px]"
      />
    </section>
  )
}
