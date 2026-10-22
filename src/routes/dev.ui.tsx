import * as React from 'react'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { toast } from 'sonner'

import { ICON_MEANINGS, Icons } from '#/components/app/icons'
import type { IconName } from '#/components/app/icons'
import { SaveStatus } from '#/components/app/save-status'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '#/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { Field } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { RadioGroup, RadioGroupItem } from '#/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Switch } from '#/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Textarea } from '#/components/ui/textarea'

// Dev-only gallery: every token and every control in its states. Not shipped to production.
export const Route = createFileRoute('/dev/ui')({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  component: UiGallery,
})

const swatches = [
  'paper',
  'paper-2',
  'rule',
  'rule-2',
  'rule-strong',
  'ink',
  'ink-2',
  'ink-3',
  'brand',
  'accent',
  'accent-hover',
  'accent-soft',
  'graphite',
  'ok',
  'warn',
  'danger',
] as const

function Section({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-(--color-rule) py-8">
      <h2 className="text-(length:--text-lg) font-semibold">{title}</h2>
      {note && (
        <p className="mt-1 text-(length:--text-sm) text-(--color-ink-3)">
          {note}
        </p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  )
}

function State({
  name,
  children,
}: {
  name: string
  children: React.ReactNode
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <span className="label-mono text-(--color-ink-3)">{name}</span>
      {children}
    </div>
  )
}

function UiGallery() {
  const [saving, setSaving] = React.useState(false)

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
      <header className="py-10">
        <Link to="/" className="text-(length:--text-sm)">
          ← Danh sách dự án
        </Link>
        <p className="mt-6 label-mono text-(--color-ink-3)">Dev · P1</p>
        <h1 className="mt-2 text-(length:--text-display) font-semibold">
          Hệ thống giao diện
        </h1>
        <p className="mt-3 max-w-2xl">
          Hallmark Cobalt, đổi màu theo logo DTP. Trang này chỉ có ở môi trường
          phát triển, dùng để kiểm tra token và đủ 8 trạng thái của từng
          control.
        </p>
      </header>

      <Section title="Màu" note="Mọi màu lấy từ src/tokens.css.">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3">
          {swatches.map((name) => (
            <div key={name} className="grid gap-2">
              <div
                className="h-14 rounded-(--radius-control) border border-(--color-rule)"
                style={{ background: `var(--color-${name})` }}
              />
              <span className="label-mono text-(--color-ink-3) normal-case">
                --color-{name}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Chữ"
        note="Be Vietnam Pro cho giao diện, JetBrains Mono cho số và nhãn. Kiểm tra dấu chồng không bị cắt."
      >
        <div className="grid gap-4">
          <p className="text-(length:--text-display) leading-(--leading-heading) font-semibold text-(--color-ink)">
            Thiết kế hố thang máy
          </p>
          <p className="text-(length:--text-2xl) leading-(--leading-heading) font-semibold text-(--color-ink)">
            Mặt cắt đứng – ẩn, ặ, ở, ữ, ỹ, Ấ, Ặ, Ở, Ữ
          </p>
          <p className="max-w-2xl">
            Xây hố đúng kích thước với dung sai theo bản vẽ. Sai lệch chiều rộng
            đo từ đường trục đối xứng về mỗi bên không vượt quá <em>+25 mm</em>.
          </p>
          <p className="font-mono">AH 1800 × BH 2000 · PIT 1500 · OP 800</p>
          <p className="label-mono text-(--color-ink-3)">Đã lưu 14:32</p>
        </div>
      </Section>

      <Section
        title="Biểu tượng"
        note="Lucide (ISC, miễn phí) — một bộ duy nhất cho cả app. Cỡ 16 / 20 / 24, nét 2px, màu theo chữ. Lấy từ #/components/app/icons."
      >
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-(--radius-card) border border-(--color-rule) bg-(--color-rule) sm:grid-cols-4 lg:grid-cols-6">
          {(Object.keys(Icons) as Array<IconName>).map((name) => {
            const Icon = Icons[name]
            return (
              <li
                key={name}
                className="grid min-w-0 gap-2 bg-(--color-paper) p-3 text-(--color-ink)"
              >
                <Icon className="size-5" aria-hidden="true" />
                <span className="truncate text-(length:--text-sm)">
                  {ICON_MEANINGS[name]}
                </span>
                <code className="truncate text-(length:--text-xs) text-(--color-ink-3)">
                  {name}
                </code>
              </li>
            )
          })}
        </ul>

        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <State name="cỡ 16 · 20 · 24">
            <div className="flex items-end gap-4 text-(--color-ink)">
              <Icons.downloadPdf className="size-4" aria-hidden="true" />
              <Icons.downloadPdf className="size-5" aria-hidden="true" />
              <Icons.downloadPdf className="size-6" aria-hidden="true" />
            </div>
          </State>
          <State name="màu theo chữ">
            <div className="flex items-center gap-4">
              <Icons.search
                className="size-5 text-(--color-ink-3)"
                aria-hidden="true"
              />
              <Icons.success
                className="size-5 text-(--color-ok)"
                aria-hidden="true"
              />
              <Icons.warning
                className="size-5 text-(--color-danger)"
                aria-hidden="true"
              />
              <Icons.create
                className="size-5 text-(--color-accent)"
                aria-hidden="true"
              />
            </div>
          </State>
          <State name="trong nút · nút chỉ có icon">
            <div className="flex flex-wrap items-center gap-2">
              <Button>
                <Icons.create aria-hidden="true" />
                Tạo dự án
              </Button>
              <Button variant="outline" size="icon" aria-label="Thêm thao tác">
                <Icons.more aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Xóa">
                <Icons.delete aria-hidden="true" />
              </Button>
            </div>
          </State>
        </div>
      </Section>

      <Section
        title="Nút"
        note="Hover, focus (Tab) và nhấn: thao tác trực tiếp trên nút ở cột đầu."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <State name="default · hover · focus · active">
            <Button>Tải PDF</Button>
          </State>
          <State name="disabled">
            <Button disabled>Tải PDF</Button>
          </State>
          <State name="loading">
            <Button loading>Tải PDF</Button>
          </State>
          <State name="error">
            <Button variant="outline" aria-invalid="true">
              Thử lại
            </Button>
          </State>
          <State name="success">
            <Button data-status="success">Đã lưu</Button>
          </State>
          <State name="outline">
            <Button variant="outline">Nhân bản</Button>
          </State>
          <State name="ghost">
            <Button variant="ghost">Đổi tên</Button>
          </State>
          <State name="destructive">
            <Button variant="destructive">Xóa dự án</Button>
          </State>
        </div>
        <div className="mt-4">
          <Button
            variant="outline"
            loading={saving}
            onClick={() => {
              setSaving(true)
              setTimeout(() => {
                setSaving(false)
                toast.success('Đã lưu phiên bản')
              }, 1200)
            }}
          >
            Thử trạng thái loading + toast
          </Button>
        </div>
      </Section>

      <Section
        title="Ô nhập"
        note="Viền 1px ở mọi trạng thái; dòng gợi ý luôn giữ chỗ."
      >
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Field label="Chiều rộng hố AH" unit="mm" hint="Đo trong lòng tường.">
            <Input inputMode="numeric" defaultValue="1800" />
          </Field>
          <Field label="Chiều sâu hố BH" unit="mm">
            <Input inputMode="numeric" placeholder="2000" />
          </Field>
          <Field
            label="Cửa OP"
            unit="mm"
            error="OP lớn hơn lỗ chờ (1000). Giảm OP hoặc đổi loại bao che."
          >
            <Input inputMode="numeric" defaultValue="1100" />
          </Field>
          <Field
            label="PIT"
            unit="mm"
            status="success"
            hint="Đạt mức tham khảo."
          >
            <Input inputMode="numeric" defaultValue="1500" />
          </Field>
          <Field label="Mã hiệu thang" status="loading" hint="Đang kiểm tra…">
            <Input defaultValue="MRL - 750 - CO60 - 9/9" />
          </Field>
          <Field
            label="Tên công trình"
            hint="Không sửa được khi đang xuất PDF."
          >
            <Input disabled defaultValue="CÔNG TRÌNH MẪU" />
          </Field>
          <Field label="Loại thang" showStatusIcon={false}>
            {(controlProps) => (
              <Select defaultValue="mrl">
                <SelectTrigger {...controlProps}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mrl">
                    Tải khách không phòng máy (MRL)
                  </SelectItem>
                  <SelectItem value="mr">Tải khách có phòng máy</SelectItem>
                </SelectContent>
              </Select>
            )}
          </Field>
          <Field label="Ghi chú thêm" hint="In ở cuối trang 01.">
            <Textarea placeholder="Không bắt buộc" />
          </Field>
        </div>
      </Section>

      <Section title="Lựa chọn">
        <div className="grid gap-6 sm:grid-cols-3">
          <State name="checkbox">
            <label className="flex items-center gap-2 text-(length:--text-sm)">
              <Checkbox defaultChecked /> Có cửa tầng
            </label>
            <label className="flex items-center gap-2 text-(length:--text-sm) opacity-55">
              <Checkbox disabled /> Đã khóa
            </label>
          </State>
          <State name="switch">
            <label className="flex items-center gap-2 text-(length:--text-sm)">
              <Switch defaultChecked /> Ghi chú xây chèn
            </label>
          </State>
          <State name="radio">
            <RadioGroup defaultValue="wide">
              <label className="flex items-center gap-2 text-(length:--text-sm)">
                <RadioGroupItem value="wide" /> Bao che rộng JD320
              </label>
              <label className="flex items-center gap-2 text-(length:--text-sm)">
                <RadioGroupItem value="narrow" /> Bao che hẹp 35×50
              </label>
            </RadioGroup>
          </State>
        </div>
      </Section>

      <Section title="Trạng thái & thông báo">
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Trình duyệt</Badge>
            <Badge variant="secondary">9 tầng</Badge>
            <Badge variant="outline">DTP 05</Badge>
            <span className="rounded-(--radius-control) bg-(--color-warn) px-2 py-1 label-mono text-(--color-ink)">
              2 cảnh báo
            </span>
          </div>
          <div className="flex flex-wrap gap-6">
            <SaveStatus state={{ kind: 'saving' }} />
            <SaveStatus state={{ kind: 'saved', at: new Date() }} />
            <SaveStatus
              state={{ kind: 'error', retry: () => toast('Đang thử lại…') }}
            />
          </div>
          <Alert>
            <AlertTitle>PIT thấp hơn mức tham khảo</AlertTitle>
            <AlertDescription>
              Tốc độ 90 m/ph thường cần PIT từ 1500 mm. Kỹ sư cần xác nhận.
            </AlertDescription>
          </Alert>
        </div>
      </Section>

      <Section title="Accordion, bảng, hộp thoại">
        <Accordion type="single" collapsible defaultValue="b">
          <AccordionItem value="a">
            <AccordionTrigger>A. Thông tin hồ sơ</AccordionTrigger>
            <AccordionContent>
              Tên công trình, địa chỉ, hạng mục…
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="b">
            <AccordionTrigger>B. Đặc tính kỹ thuật</AccordionTrigger>
            <AccordionContent>
              Tải trọng, hố thang, cabin, cửa…
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="mt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tầng</TableHead>
                <TableHead className="text-right">Chiều cao (mm)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ['5F (OH)', '4800'],
                ['4F', '3600'],
                ['2F ~ 3F', '3600'],
                ['1F', '3900'],
              ].map(([floor, h]) => (
                <TableRow key={floor}>
                  <TableCell>{floor}</TableCell>
                  <TableCell className="text-right font-mono">{h}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Mở hộp thoại</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo dự án</DialogTitle>
                <DialogDescription>
                  Chọn bộ mẫu để điền sẵn thông số.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button>Tạo từ bộ Khách sạn 9 tầng</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Section>

      <Section
        title="Hộp đèn xem trước"
        note="Dải tối duy nhất của màn soạn (P5)."
      >
        <div className="grid place-items-center rounded-(--radius-card) bg-(--color-graphite) p-6 text-(--color-paper)">
          <div className="aspect-420/297 w-full max-w-md rounded-sm bg-(--color-paper)" />
          <p className="mt-3 label-mono text-(--color-paper)">DTP 05 · A3</p>
        </div>
      </Section>
    </main>
  )
}
