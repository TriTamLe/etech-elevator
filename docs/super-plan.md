# Super plan — Web tạo bản vẽ xây dựng thang máy

> **Nguồn:** [`docs/bao-cao-giai-phap-web-ban-ve-thang-may.md`](bao-cao-giai-phap-web-ban-ve-thang-may.md) (báo cáo v5, 21/10/2026). Mọi quyết định nghiệp vụ lấy từ báo cáo, đặc biệt là mục 6.
> **Lập ngày:** 21/10/2026, dựa trên dự án vừa khởi tạo (TanStack Start + Cloudflare + Drizzle + shadcn).
> **Cách dùng:** mỗi bước có ô `[ ]`, làm xong thì đánh `[x]`. Mỗi phase có **tiêu chí xong**. Chỉ chuyển phase khi tiêu chí xong đã đạt.

---

## 0. Tóm tắt

| Hạng mục | Nội dung |
|---|---|
| **Sản phẩm** | Web nội bộ cho 1 người dùng. Người dùng tạo **dự án**, điền form thông số thang máy, xem trước ngay bộ bản vẽ A3 (9 trang như file mẫu), rồi tải **PDF** về gửi khách. Dự án được lưu trên server. |
| **Phạm vi MVP** | Chỉ kiểu thang giống 2 bộ mẫu (Chú Nghiêm, Ô.Khải & B.Diễm). Chỉ xuất PDF. |
| **Dựng hình** | SVG có tham số (hàm thuần `params → Prim[]`), kết hợp thư viện ký hiệu lấy từ DWG. Xem trước và PDF dùng chung một SVG. |
| **Stack** | TanStack Start (Router, Form, Query) · Zod 4 · Drizzle + Cloudflare D1 · Cloudflare Workers · Tailwind v4 + shadcn/ui · jsPDF + svg2pdf.js · Vitest + Playwright. Trình quản lý gói: **yarn 1**. |
| **Giao diện** | **Hallmark · Cobalt**, đổi màu theo logo DTP. Font giao diện **Be Vietnam Pro** + **JetBrains Mono**. Xem mục 3. |
| **Logo** | **DTP** in trên bản vẽ (bìa + khung tên). **DTP** cũng dùng cho giao diện web (masthead trang `/`, favicon) — đổi từ E-TECH sau review P1. Tất cả chuyển sang **WebP**. |
| **Hạ tầng** | Workers + D1 + Cloudflare Access (2 email), địa chỉ `*.workers.dev`. **0 USD/tháng.** |
| **Ước tính** | **38–54 người-ngày** chưa tính dự phòng; cộng dự phòng 15–20% thì khoảng **44–65 ngày (9–13 tuần)**. So với báo cáo, tăng thêm 2–3 ngày cho phần hệ thống giao diện Hallmark. |

### Quy ước làm việc

- **Trình quản lý gói:** chỉ dùng **yarn 1.22**. Không commit `package-lock.json` hay `pnpm-lock.yaml`. Thêm component shadcn bằng `npx shadcn@latest add <tên>`; CLI tự nhận yarn qua `yarn.lock`.
- **Import:** dùng alias `#/` trỏ vào `src/`, ví dụ `import { cn } from '#/lib/utils'`.
- **Tên file:** viết kiểu kebab-case cho giống code sẵn có, ví dụ `render-svg.tsx`, `export-pdf.ts`. Báo cáo ghi `exportPdf.ts`, nhưng plan này theo quy ước của code.
- **Ngôn ngữ:**
  - Giao diện viết **100% tiếng Việt**, động từ cụ thể ("Tải PDF", "Lưu phiên bản", "Tạo dự án"). Không dùng "Submit" hay "Click here".
  - Code, tên biến và commit viết bằng tiếng Anh. Ghi chú trong code ít và bằng tiếng Anh.
- **Commit:** mỗi bước lớn một commit, cuối mỗi phase có commit tổng.
- **Subagent** đặt trong `.claude/agents/`:
  - `test-runner`: chạy sau khi đổi logic trong `src/domain` hoặc `src/drawing`.
  - `code-reviewer`: chạy trước mỗi commit cuối phase.
  - `sheet-verifier`: chạy sau khi đổi hàm vẽ trang.
  - `symbol-extractor`: dùng ở P7.
- **Tiêu chí xong chung cho mọi phase:** `yarn typecheck`, `yarn lint` và `yarn test` đều xanh; `yarn build` chạy được; không có lỗi trong console khi `yarn dev`.

---

## 1. Hiện trạng dự án (21/10/2026)

| Thành phần | Hiện trạng | Việc cần làm (phase) |
|---|---|---|
| Framework | TanStack Start 1.169, Router 1.170, Form 1.33, Query 5.104, React 19, Vite 8, TS 6, Zod 4 | Giữ nguyên |
| Cloudflare | Đã có `@cloudflare/vite-plugin` và `wrangler.jsonc` (tên còn là `tanstack-start-app`, chưa có binding D1) | Đổi tên, thêm D1 (P0) |
| Database | Drizzle dùng **better-sqlite3** + `DATABASE_URL` (không chạy được trên Workers); schema mẫu `todos` | Chuyển sang `drizzle-orm/d1`, viết schema thật (P0) |
| Trình quản lý gói | Có cả `package-lock.json` lẫn `yarn.lock`; `node_modules` cài bằng yarn | Chốt yarn, xóa lock của npm (P0) |
| `public/docs/` | Chứa báo cáo + **2 PDF mẫu có tên và địa chỉ khách hàng**. Mọi thứ trong `public/` bị đưa lên web cùng bản build | Chuyển ra `docs/` và `.external/reference/` (P0) |
| Logo | `public/logos/` có `dtp_education_solutions.png` (1298×663, 406 KB), `e-tech.png` (585×265, 102 KB) và 2 file `.ico` | Chuyển sang WebP, bản gốc PNG đưa vào `assets/brand/` (P0) |
| DWG | `.external/BV - CT NHÀ TƯ NHÂN Ô.KHẢI B.DIỄM - NHS - TP ĐN.dwg` (đã gitignore) | Dùng ở P7 |
| Giao diện | `styles.css` của template: font Fraunces/Manrope từ Google, theme "sea-ink", các class demo | Viết lại theo Hallmark Cobalt × DTP (P1) |
| Kiểm thử | Chưa có Vitest hay Playwright | Thêm Vitest (P0), Playwright (P5) |
| Git | Repo chưa có commit nào | Commit đầu tiên ở cuối P0 |
| AGENTS.md | Yêu cầu dùng `@tanstack/intent` nhưng gói này chưa được cài | Cài làm dev dependency (P0) |

---

## 2. Lộ trình tổng

| Phase | Nội dung | Ngày | Phụ thuộc | Mốc |
|---|---|---|---|---|
| **P0** | Dọn nền, cấu hình yarn, D1, WebP, công cụ | 1–1.5 | — | |
| **P1** | Hệ thống giao diện Hallmark Cobalt × DTP | 2–3 | P0 | |
| **P2** | Mô hình dữ liệu: Zod, 2 bộ mẫu, derive, luật kiểm tra | 2–3 | P0 | |
| **P3** | Lưu dự án (server function + D1) + trang danh sách dự án | 3–4 | P1, P2 | |
| **P4** | Form soạn thông số + tự lưu + phiên bản | 3–4 | P3 | |
| **P5** | Lõi vẽ, khung trang A3, trang chữ, xem trước, xuất PDF | 6.5–8.5 | P4 | |
| **P6** | Deploy + Cloudflare Access + sao lưu | 0.5–1 | P5 | **M1: dùng được online** (bìa, 01, 02) |
| **P7** | Thư viện ký hiệu từ DWG | 3–4 | P0 (chạy song song được với P1–P6) | |
| **P8** | Bộ phần tử vẽ cơ bản | 3–4 | P5 | |
| **P9** | Mặt cắt ngang, pit, phòng máy | 4–6 | P7, P8 | **M2: có hình mặt bằng** |
| **P10** | Cửa tầng (bao che rộng / hẹp) | 2–3 | P9 | |
| **P11** | Mặt cắt đứng + các biến thể của bộ 2 | 6–9 | P9, P10 | **M3: đủ 9 trang** |
| **P12** | Kiểm thử tổng, hoàn thiện, hiệu năng | 2–3 | P11 | |
| **P13** | Bàn giao, dùng thử thực tế | ~0.5 + thời gian bạn dùng thử | P12 | **M4: phát hành MVP** |
| | **Tổng** | **38–54** | | |

```mermaid
flowchart LR
  P0 --> P1 & P2 & P7
  P1 & P2 --> P3 --> P4 --> P5 --> P6
  P5 --> P8
  P7 & P8 --> P9 --> P10 --> P11 --> P12 --> P13
```

### Lịch làm việc (Apple Calendar · lịch "Nghiệp" · 7:00–9:00 mỗi ngày)

Mỗi phase có một buổi 2 tiếng; tên event có dạng `Thang máy · P<n> · …`. Nếu một phase chưa xong trong buổi của nó thì dời các buổi sau, đồng thời cập nhật cả bảng này lẫn lịch.

| Ngày | Phase | Ngày | Phase |
|---|---|---|---|
| T5 22/10 | P1 · Giao diện | T5 29/10 | P8 · Phần tử vẽ |
| T6 23/10 | P2 · Mô hình dữ liệu | T6 30/10 | P9 · Mặt bằng, pit, phòng máy (M2) |
| T7 24/10 | P3 · Lưu dự án + danh sách | T7 31/10 | P10 · Cửa tầng |
| CN 25/10 | P4 · Form soạn | CN 1/11 | P11 · Mặt cắt đứng (M3) |
| T2 26/10 | P5 · Lõi vẽ + PDF | T2 2/11 | P12 · Kiểm thử tổng |
| T3 27/10 | P6 · Deploy (M1) | T3 3/11 | P13 · Bàn giao (M4) |
| T4 28/10 | P7 · Ký hiệu DWG | | |

> Ước tính gốc là 38–54 ngày công, trong khi lịch chỉ có 13 buổi × 2 tiếng. Lịch này chỉ chạy kịp nếu Claude viết phần lớn code trong buổi, còn bạn duyệt và chạy thử. P5 và P11 là hai phase dễ phải thêm buổi nhất.

---

## 3. Hệ thống giao diện — Hallmark · Cobalt × DTP

### 3.1 Bối cảnh thiết kế (cổng thiết kế của Hallmark)

- **Người dùng:** 1 kỹ sư hoặc nhân viên lập hồ sơ thang máy, dùng nội bộ, thao tác nhiều lần mỗi ngày, quen bản vẽ CAD.
- **Việc chính:** mở hoặc tạo dự án → chỉnh thông số → kiểm tra bản vẽ → **Tải PDF**.
- **Giọng:** technical, kiểu bảng điều khiển máy: điềm tĩnh, chính xác, nhanh.
- **Genre:** modern-minimal. **Theme gốc:** Cobalt (catalog). Màu được thay bằng bộ màu thương hiệu DTP; cấu trúc và kỷ luật của Cobalt giữ nguyên.

### 3.2 Giữ gì từ Cobalt, đổi gì

| Chữ ký của Cobalt | Áp dụng vào app |
|---|---|
| Nền trắng lạnh, không dùng `#fff` | `--color-paper` = `oklch(98.5% 0.004 249)`, cùng sắc độ với navy DTP |
| Đường kẻ mảnh làm khung, không bóng đổ, không thẻ nổi | Form, bảng dự án, các panel đều chia bằng viền 1px `--color-rule` |
| **Một** màu nhấn tín hiệu, chiếm dưới 5% màn hình | Xanh DTP dùng cho nút chính, vòng focus, mục đang chọn, link khi hover |
| "Code là nhân vật chính" | **Bản vẽ là nhân vật chính**: khu xem trước là "hộp đèn" nền graphite, trên đó đặt các tờ A3 trắng |
| Một dải tối duy nhất mỗi trang | Hộp đèn xem trước ở màn soạn chính là dải tối đó. Trang danh sách dự án không có dải tối |
| Thanh điều hướng có viền + bảng lệnh ⌘K chạy thật | **Không có header và không có bảng lệnh** (chốt sau review P1: app chỉ có dự án). Trang `/` có masthead căn giữa (logo DTP + tên công cụ); màn soạn chỉ có một thanh mảnh với link về danh sách |
| Bo góc gọn: 6px cho control, 10px cho thẻ | Giữ nguyên |
| Nhãn mono viết HOA, giãn chữ `0.06em` | Nhãn nhóm form, trạng thái ("ĐÃ LƯU 14:32"), số đo mm, phím tắt |
| Chuyển động tiết chế | Chỉ fade + nâng ~10px khi xuất hiện, gạch chân lớn dần khi hover. Không bounce, không parallax. Tôn trọng `prefers-reduced-motion` |
| Không màu cam làm accent | Cam DTP **chỉ** dùng cho trạng thái cảnh báo, không bao giờ làm accent |

### 3.3 Token màu (OKLCH, lấy từ logo DTP)

Màu đo từ `dtp_education_solutions.png`:

| Màu logo | Hex | OKLCH |
|---|---|---|
| Navy (chủ đạo) | `#123E65` | `oklch(35.6% 0.083 249)` |
| Xanh vừa | `#2E75A4` | `oklch(54.0% 0.102 241)` |
| Xanh sáng | `#3A93C1` | `oklch(63.0% 0.108 235)` |
| Cam | `#F8AD16` | `oklch(79.9% 0.164 77)` |
| Xanh lá | `#57A747` | `oklch(65.6% 0.154 140)` |

| Token | Giá trị đề xuất | Dùng cho |
|---|---|---|
| `--color-paper` | `oklch(98.5% 0.004 249)` | Nền chính |
| `--color-paper-2` | `oklch(96.6% 0.006 249)` | Nền panel form, hàng bảng khi hover |
| `--color-rule` | `oklch(90.5% 0.010 249)` | Đường kẻ mảnh |
| `--color-rule-2` | `oklch(84% 0.016 249)` | Viền input, viền mạnh |
| `--color-ink` | `oklch(24% 0.035 249)` | Tiêu đề (charcoal ngả navy) |
| `--color-ink-2` | `oklch(34% 0.030 249)` | Chữ thân |
| `--color-muted` | `oklch(52% 0.020 249)` | Chữ phụ, placeholder |
| `--color-brand` | `oklch(35.6% 0.083 249)` | Navy DTP: tên app, điểm nhấn thương hiệu |
| `--color-accent` | `oklch(52% 0.130 245)` | **Tín hiệu duy nhất**: nút chính, focus, mục đang chọn (xanh DTP đẩy độ bão hòa lên) |
| `--color-accent-ink` | `oklch(98.5% 0.004 249)` | Chữ trên nền accent |
| `--color-graphite` | `oklch(23% 0.030 249)` | Hộp đèn xem trước |
| `--color-ok` | `oklch(56% 0.140 140)` | Trạng thái đã lưu / hợp lệ (xanh lá DTP, tối lại để đủ tương phản) |
| `--color-warn` | `oklch(79.9% 0.164 77)` | Nền chip cảnh báo, chữ trên chip là `--color-ink` (cam DTP) |
| `--color-danger` | `oklch(55% 0.190 27)` | Lỗi chặn xuất file. Logo không có màu đỏ, nên đây là màu thêm vào |

Yêu cầu: chữ thân trên nền giấy đạt tương phản **≥ 4.5:1**, vòng focus đạt **≥ 3:1**. Kiểm tra lại khi làm P1.

### 3.4 Chữ

| Vai trò | Font | Lý do |
|---|---|---|
| Tiêu đề + chữ giao diện | **Be Vietnam Pro** (400 / 500 / 600 / 700) | Do người Việt thiết kế riêng cho dấu tiếng Việt, dấu chồng (ấ, ặ, ở, ữ) cân đối. Nét grotesk kỹ thuật, thay vai trò của Space Grotesk + Inter trong Cobalt |
| Mono: số đo, nhãn, phím tắt, trạng thái | **JetBrains Mono** (400 / 500) | Giọng mono của Cobalt. Đã kiểm tra trên Google Fonts: có bộ chữ `vietnamese` |
| Chữ trong **bản vẽ** (SVG + PDF) | **Tinos** (TTF) | Số đo khớp Times New Roman như bản gốc. Chỉ dùng trong bản vẽ, không dùng cho giao diện |

- Tự host font qua `@fontsource/be-vietnam-pro` và `@fontsource-variable/jetbrains-mono`. Không gọi Google Fonts lúc chạy. Tinos tải file TTF gốc (giấy phép Apache 2.0) đặt vào `public/fonts/tinos/`, vì jsPDF cần TTF.
- **Line-height cho tiếng Việt:** chữ thân **≥ 1.55**, tiêu đề **≥ 1.25**, để dấu chồng không bị cắt. Không để `overflow: hidden` sát dòng chữ có dấu.
- Tiêu đề luôn đứng, không nghiêng (quy tắc Hallmark). Nhấn mạnh bằng độ đậm hoặc màu.

### 3.5 Màn hình

| Màn | Bố cục | Ghi chú |
|---|---|---|
| **Danh sách dự án** (`/`) | Logo DTP căn giữa, dưới là tiêu đề "Công cụ tự động sinh báo cáo thiết kế thang máy". Bên dưới là một khối viền gồm hàng công cụ (ô tìm dự án + nút **Tạo dự án**, chọn 1 trong 2 bộ mẫu) và danh sách. Bảng dự án kẻ mảnh gồm: tên công trình · địa chỉ · cập nhật lúc · thao tác (mở / nhân bản / đổi tên / xóa) | Kiểu "trang mục lục" bình tĩnh. Hiển thị trạng thái rỗng khi chưa có dự án. Xóa có nút **Hoàn tác**, không hỏi xác nhận |
| **Màn soạn** (`/projects/$id`) | Kiểu "Workbench". Form bên trái (~420px, accordion A–F) · hộp đèn graphite bên phải chứa tờ A3 + cột thumbnail · thanh trạng thái dưới (lưu / lỗi / cảnh báo) | Từ 1024px trở lên chia đôi màn hình. Dưới 1024px chuyển thành 2 tab "Thông số / Xem trước". Ở 320px không được vỡ |
| **Trang dev** (`/dev/*`, chỉ khi DEV) | Bộ sưu tập ký hiệu, bộ sưu tập phần tử vẽ, trang xuất PDF từ bộ mẫu | Ở bản production trả về `notFound()` |

### 3.6 Kỷ luật Hallmark áp dụng cho mọi phase có giao diện

- [ ] Token khóa cứng: mọi màu và font lấy từ `src/tokens.css`. Không viết hex/OKLCH trực tiếp trong component.
- [ ] Mỗi control tương tác có đủ 8 trạng thái: default · hover · focus-visible · active · disabled · loading · error · success.
- [ ] Vòng focus hiện ngay, không có hiệu ứng chuyển.
- [ ] Không vỡ bố cục và không cuộn ngang ở 320 / 375 / 414 / 768px. `html, body { overflow-x: clip }`.
- [ ] Copy trung thực: không bịa số liệu. Trạng thái rỗng nói rõ việc cần làm tiếp.
- [ ] Lưu thành công thì im lặng (chỉ đổi chữ trạng thái). Thao tác xóa có nút Hoàn tác.
- [ ] Đóng dấu `/* Hallmark · ... */` ở đầu `tokens.css`, ghi `.hallmark/log.json`.
- [ ] Chạy slop test của Hallmark trước khi xong P1 và P12.

---

## 4. Chi tiết từng phase

### P0 — Dọn nền & cấu hình (1–1.5 ngày)

**Mục tiêu:** template sạch, chạy được trên Workers với D1 local, tài liệu và logo đặt đúng chỗ, có commit đầu tiên.

**Trình quản lý gói**
- [x] Xóa `package-lock.json`, thêm `"packageManager": "yarn@1.22.22"` vào `package.json`.
- [x] Bỏ mục `pnpm` trong `package.json`.
- [x] Đổi script `deploy` thành `yarn build && wrangler deploy`.
- [x] Sửa `.cursorrules` (bỏ `pnpm dlx`, dùng `npx shadcn@latest add`).
- [x] Cài `@tanstack/intent` làm dev dependency để quy trình trong AGENTS.md chạy được. Kiểm tra bằng `yarn intent list`.

**Tài liệu và file mẫu ra khỏi `public/`**
- [x] `public/docs/bao-cao-giai-phap-web-ban-ve-thang-may.md` → `docs/`.
- [x] 2 PDF mẫu → `.external/reference/` (đã gitignore, vì có thông tin khách hàng).
- [x] Xóa `public/docs/` và `public/drizzle.svg` (file thừa của template).

**Logo sang WebP**
- [x] Đưa PNG gốc vào `assets/brand/` (giữ làm bản gốc, không phục vụ trên web).
- [x] Tạo `public/brand/dtp-logo.webp`: giữ 1298px, dùng cho bìa và khung tên, đủ nét khi in A3.
- [x] ~~`public/brand/etech-logo.webp`~~ — đã bỏ sau review P1; app dùng logo DTP.
- [x] Favicon lấy từ `dtp-logo.ico` → `public/favicon.ico` (đổi từ E-TECH sau review P1).
- [x] Ghi lại dung lượng trước và sau khi chuyển.
- [x] Lưu ý: PDF có dùng được WebP hay không sẽ thử ở P5. Nếu jsPDF không nhận WebP thì đổi WebP → PNG ngay trong trình duyệt bằng canvas, nên **chỉ cần phục vụ file WebP**.
- [x] Lưu ý: logo E-TECH chỉ 585px, đủ cho giao diện. Nếu sau này cần in E-TECH lên giấy thì cần file lớn hơn.

**Cloudflare + D1**
- [x] `wrangler.jsonc`: đổi `name` thành `elevator` (địa chỉ sẽ là `elevator.<account>.workers.dev`), cập nhật `compatibility_date`.
- [x] Thêm `d1_databases` với `binding: DB`, `database_name: elevator-db`, `migrations_dir: drizzle`. `database_id` tạm để chỗ trống, điền thật ở P6.
- [x] `src/db/index.ts`: đổi sang `drizzle-orm/d1`, lấy kết nối qua `env.DB` (`cloudflare:workers`).
- [x] Bỏ `better-sqlite3`, `@types/better-sqlite3`, `dotenv`, `.env.local`.
- [x] `drizzle.config.ts`: chỉ dùng để sinh migration (dialect sqlite, không cần credential).
- [x] `src/db/schema.ts`: thay `todos` bằng `projects` + `project_versions` (theo mục 4.3 của báo cáo). Sinh migration `drizzle/0000_*.sql`, rồi áp dụng bằng `wrangler d1 migrations apply elevator-db --local`.
- [x] Thêm script `cf-typegen` (`wrangler types`) để có kiểu `Env`.

**Dọn template**
- [x] `__root.tsx`: `lang="vi"`, đổi title, chỉ bật devtools khi DEV, gắn favicon.
- [x] `index.tsx`: trang tạm "Danh sách dự án". Giao diện thật làm ở P3.
- [x] `README.md`: viết lại bằng tiếng Việt (cài đặt, script, tài liệu, deploy).
- [x] Không đụng `styles.css` ở bước này, để dành cho P1.

**Công cụ**
- [x] Thêm Vitest (`yarn test`, `yarn test:watch`) và một smoke test.
- [x] Thêm script `typecheck` (`tsc --noEmit`), `db:migrate:local`, `db:migrate:remote`, `db:backup`.

**Cho trợ lý AI**
- [x] Viết `CLAUDE.md` gồm quy tắc dự án, đường dẫn tài liệu và lệnh hay dùng.
- [x] Cập nhật `.claude/agents/*` theo đường dẫn thật (`.external/reference/`, `.external/*.dwg`, `src/db/`) và dùng yarn.

**Git**
- [x] `.gitignore`: thêm `.verify/`, `backups/`, `tools/extract-symbols/.venv`, `tools/extract-symbols/.out`, `.claude/settings.local.json`.
- [x] Commit đầu tiên.

**Tiêu chí xong:**
- `yarn typecheck`, `yarn lint`, `yarn test` và `yarn build` đều xanh.
- `yarn dev` mở được trang.
- D1 local có 2 bảng.
- `wrangler deploy --dry-run` qua.
- `public/` không còn file mẫu.

**Kết quả P0 (21/10/2026) — đã đạt mọi tiêu chí:**
- **Logo WebP** (q92 + sharp_yuv; PSNR 49 dB, bằng mắt không phân biệt được với bản gốc):
  - DTP: 406 KB → **95,5 KB**
  - E-TECH: 102 KB → **25,7 KB**
- **D1 local:** đã áp dụng migration `drizzle/0000_init.sql`. Bảng `project_versions` có thêm cột `schema_version`, để khôi phục được phiên bản cũ sau khi đổi schema.
- **`wrangler.jsonc`:** `database_id` đang để chỗ trống (`00000000-…`), điền ID thật ở P6.
- **`worker-configuration.d.ts`:** sinh bằng `yarn cf-typegen` và được commit, để clone về là typecheck được ngay.
- **Còn để lại cho P1:**
  - Dự án đang có 2 hàm `cn` (gói npm `cn` dùng trong `components/ui/*`, và `#/lib/utils`). P1 sẽ thống nhất lại.
  - Các component shadcn của template đang dùng nháy kép, chưa theo Prettier.

---

### P1 — Hệ thống giao diện Hallmark Cobalt × DTP (2–3 ngày)

**Mục tiêu:** có token, font, các component cơ bản đủ 8 trạng thái, khung app, sẵn sàng cho P3 và P4.

- [x] **`src/tokens.css`**:
  - Đầy đủ token ở mục 3.3 và 3.4, cùng thang khoảng cách 4pt (`--space-*`), thang chữ (`--text-*`), bo góc (`--radius-control: 6px`, `--radius-card: 10px`), easing (`--ease-out`, `--ease-in`, `--ease-in-out`) và thời lượng (`--dur-*`).
  - Dòng đầu là dấu `/* Hallmark · ... */`.
- [x] **`src/styles.css`** (chỉ bổ sung, không xóa nền tảng):
  - Giữ `@import 'tailwindcss'`, `@plugin`, `tw-animate-css`.
  - Bỏ import Google Fonts (Fraunces/Manrope) và các class demo (`island-shell`, `feature-card`, `body::before`…).
  - Ánh xạ token Hallmark sang biến của shadcn (`--background`, `--foreground`, `--primary`, `--ring`, `--border`…) và vào `@theme inline`.
  - Đặt `html, body { overflow-x: clip }`.
- [x] **Font:**
  - `yarn add @fontsource/be-vietnam-pro @fontsource-variable/jetbrains-mono`, import vào root.
  - `--font-display` và `--font-body` = Be Vietnam Pro; `--font-mono` = JetBrains Mono.
  - Line-height chuẩn theo mục 3.4.
- [x] **Component shadcn:** cài thêm `accordion dialog command table tabs tooltip sonner badge radio-group checkbox separator scroll-area dropdown-menu alert`. Chỉnh lại cho đủ 8 trạng thái, bo góc 6px, viền mảnh.
- [x] **Dọn component:** dùng chung một hàm `cn` (`#/lib/utils`), gỡ gói npm `cn` nếu không còn dùng; chạy `yarn format` cho `components/ui/*`.
- [x] **Khung app `src/components/app/`:**
  - `app-shell.tsx`: thanh trên cùng có viền, logo E-TECH, tên app, nút ⌘K, nút chính.
  - `command-palette.tsx`: mở bằng ⌘K hoặc Ctrl+K, điều khiển bằng bàn phím.
  - `save-status.tsx`: chữ trạng thái kiểu mono.
- [x] **Trang mẫu `/dev/ui`:** hiển thị từng control ở cả 8 trạng thái để kiểm tra bằng mắt.
- [x] **Kiểm tra:** tương phản màu (≥ 4.5:1 cho chữ, ≥ 3:1 cho focus); bố cục ở 320/375/414/768px; `prefers-reduced-motion`.
- [x] **Khóa hệ thống:** tạo `design.md` ở gốc dự án (Hallmark "lock the system") để mọi màn sau dùng chung hệ thống. Ghi `.hallmark/log.json`.
- [x] **Slop test Hallmark:** mọi cửa kiểm áp dụng phải qua.

**Tiêu chí xong:** `/dev/ui` hiển thị đúng ở cả 4 độ rộng; không còn class của template; slop test qua; có `design.md`.

**Kết quả P1 (22/10/2026):**
- Token ở `src/tokens.css` (đã kiểm tương phản WCAG: chữ ≥ 4.5:1, viền control `rule-strong` 3.48:1, vòng focus ≥ 3:1). Font Be Vietnam Pro + JetBrains Mono tự host qua `@fontsource`.
- `styles.css` viết lại: bỏ Google Fonts, theme sea-ink, class demo, khối `.dark`; biến shadcn ánh xạ lên token. Component gọi token bằng `bg-(--color-…)`.
- Gỡ gói npm `cn` và `next-themes`; thêm 15 component shadcn; bỏ `transition-all`, vòng focus dạng outline hiện ngay, khoảng cách đưa về bội số 4px.
- Mới: `field.tsx`, `app-shell.tsx` (nav N13), `command-palette.tsx` (⌘K + `useRegisterCommands`), `save-status.tsx`, trang 404 tiếng Việt, `/dev/ui` (file phẳng `dev.ui.tsx` theo quy ước mới), `design.md`, `.hallmark/log.json`.
- Đã chụp kiểm tra ở 320 / 375 / 414 / 1280px: không cuộn ngang, dấu tiếng Việt không bị cắt.
- **Chưa kiểm bằng tay:** Tab qua các control trên trình duyệt thật — làm đầu buổi P2.
- **Biểu tượng (22/10):** chốt **Lucide** (`lucide-react`, ISC, miễn phí) làm bộ duy nhất; bộ từ vựng icon của app ở `src/components/app/icons.ts`; `/dev/ui` có mục "Biểu tượng" (24 icon, cỡ 16/20/24, màu, trong nút).
- **Sửa sau review (22/10):** bỏ header (`app-shell.tsx`), bảng lệnh ⌘K (`command-palette.tsx`, `ui/command.tsx`, gói `cmdk`) và logo E-TECH. Trang `/` thành masthead DTP căn giữa + khối danh sách gọn (ô tìm + nút Tạo dự án gắn liền). Thêm `brand-mark.tsx`; 404 cũng không còn header.
- **Lưu ý:** chunk của `/dev/ui` vẫn có trong bundle client, nhưng ở production route bị chặn bằng `notFound()` trước khi tải.

---

### P2 — Mô hình dữ liệu (2–3 ngày)

**Mục tiêu:** toàn bộ thông số và luật nghiệp vụ nằm trong `src/domain/`, là code thuần và có test.

- [x] **`src/domain/schema.ts`:**
  - Zod schema `ElevatorParams` gồm nhóm A–F, mảng `floors`, mảng `revisions` (8 cột) và `schemaVersion = 1`.
  - Đơn vị mm. Kiểu dữ liệu xuất ra bằng `z.infer`.
- [x] **`src/domain/presets/`:**
  - `hotel-9f.ts` (= bộ 1) và `house-5f.ts` (= bộ 2), nhập đủ giá trị theo mục 1.5 và mục 2 của báo cáo. **Tên công trình, địa chỉ, người ký đã ẩn danh**; số liệu kỹ thuật giữ nguyên.
  - Mã hiệu là chữ tự do.
  - CPM mặc định 800×1200.
  - Bộ Ô.Khải: tầng 1F 3900, 2F–4F 3600, PIT 1400, OH 3600 + buồng 1200, dầm kiềng 200×300 (mái) / 200×400 (tầng), dầm đặt máy 3 phía, bật ghi chú xây chèn.
- [x] **`src/domain/derive.ts`:**
  - Tổng chiều cao hố; thiếu dữ liệu thì trả `null`.
  - Lỗ chờ và bề rộng hai bên theo loại bao che.
  - Vị trí móc treo ở tâm hố.
  - Gộp tầng trên hình theo bộ 2: 1F · 2F~(N−2) · N−1 · N(OH); vẽ đủ từng tầng khi N ≤ 4.
  - Dòng của bảng chiều cao tầng: gộp giống hình, tách dòng khi chiều cao khác nhau.
  - Danh sách trang và số hiệu: mỗi loại bao che đang dùng một trang cửa tầng, đánh số liền mạch.
  - Gợi ý hạng mục; địa chỉ rút gọn tự lấy địa chỉ đầy đủ khi trống.
  - Chuỗi "Tầng 2F ~ 5F" cho từng loại bao che.
- [x] **`src/domain/rules.ts`:**
  - Mức **lỗi**: CW + khe > AH; CD + khoảng > BH; OP > lỗ chờ; HH ≥ cao lỗ chờ thô; số tầng khác số điểm dừng.
  - Mức **cảnh báo**: PIT/OH dưới mức tham khảo (có ghi chú "kỹ sư cần xác nhận").
- [x] **`src/domain/migrate.ts`:** hàm `migrate(raw)` đưa dữ liệu cũ lên `schemaVersion` mới nhất.
- [x] **Test Vitest** (giao `test-runner`): số liệu chuẩn lấy từ mục 3 trong file `test-runner.md`, ví dụ 20.900 mm; 900/300; 1100/200; 750/950; gộp tầng với N = 3, 4, 5, 9, 20.

**Tiêu chí xong:** cả 2 bộ mẫu qua Zod; mọi test trong danh sách bắt buộc đều xanh.


**Kết quả P2 (22/10/2026):**
- `src/domain/`: `config.ts` (lỗ chờ, khe tối thiểu, bảng tra PIT/OH **tạm**, nhãn tiếng Việt, danh sách trang), `schema.ts` (`ElevatorParams` v1, `makeFloors`), `presets/` (`PRESETS`, `presetParams` trả bản sao), `derive.ts`, `rules.ts` (`checkRules` → `Issue[]` có `path` để gắn vào `Field`), `migrate.ts`.
- **Quy ước đã chốt khi làm:** tầng trên cùng không có chiều cao riêng, dòng N(OH) = OH + chiều cao buồng trên cùng (bộ 2: 4800, bộ 1: 5100); tổng hố = PIT + Σ tầng 1…N−1 + OH + buồng trên cùng (bộ 2 = 20.900). Bảng chiều cao tầng gộp theo quyết định #14 (khác cách in trong PDF bộ 2). Móc treo `null` = tâm hố.
- 57 test xanh (subagent `test-runner`), phủ toàn bộ checklist domain.
- **Còn mở:** bảng tra PIT/OH và `minOpeningSide = 100` là giá trị tạm — kỹ sư cần xác nhận. Kiểm Tab bằng tay trên trình duyệt thật (từ P1) vẫn chưa làm vì trình duyệt tích hợp mất kết nối.

---

### P3 — Lưu dự án + trang danh sách (3–4 ngày)

**Mục tiêu:** tạo, mở, nhân bản, đổi tên, xóa (có hoàn tác) dự án; dữ liệu nằm trong D1.

- [ ] **`src/server/projects.ts`:** viết các `createServerFn`: `listProjects`, `getProject`, `createProject(preset)`, `duplicateProject`, `renameProject`, `saveProject(params)`, `saveVersion(note)`, `listVersions`, `deleteProject` (xóa mềm) và `restoreProject`.
  - Kiểm tra đầu vào bằng Zod ở phía server.
  - Chỉ đọc/ghi JSON nhỏ, mỗi request dưới 10 ms CPU. `listProjects` chỉ trả `id, name, address, updatedAt` (lấy từ `params` lúc lưu hoặc cột riêng), **không** trả cả khối `params`.
  - ID tạo bằng `crypto.randomUUID()`.
- [ ] **`src/features/projects/queries.ts`:** dùng `queryOptions` và mutation; đổi tên và xóa có cập nhật lạc quan (optimistic). Loader của route `/` gọi `ensureQueryData` để SSR có sẵn dữ liệu (không hiện spinner ở lần tải đầu).
- [ ] **Bảng dự án bằng TanStack Table** (`yarn add @tanstack/react-table`, bản 9.x; nạp Intent skill của gói trước khi viết). Quy tắc chung nằm trong `CLAUDE.md` › Data tables và `design.md` › Data tables.
  - **Cột:** Tên công trình (link mở dự án) · Địa chỉ · Cập nhật lúc (mono, `vi-VN`, ví dụ "14:32 · 22/10") · Thao tác (menu `Icons.more`: Mở, Nhân bản, Đổi tên, Xuất JSON, Xóa).
  - **Sắp xếp:** mặc định theo cập nhật mới nhất; bấm tiêu đề Tên / Cập nhật để đổi chiều, có `aria-sort` và icon `sortAsc/sortDesc`.
  - **Tìm kiếm:** ô tìm trong hàng công cụ (đã có ở `/`); debounce 250 ms bằng `src/lib/use-debounced-value.ts`; so khớp không dấu (`đ`→`d`, bỏ dấu) trên tên + địa chỉ; giữ trong search param `?q=` (`validateSearch` bằng Zod) để tải lại vẫn còn; nút `Icons.clear` để xóa; phím Esc xóa ô tìm.
  - **Loading & UX:**
    - Lần đầu: dữ liệu có sẵn từ SSR. Khi client tải lại: 5 dòng skeleton cao đúng bằng dòng thật (không giật bố cục).
    - Refetch nền: giữ dòng cũ (`placeholderData: keepPreviousData`), chỉ hiện chỉ báo nhỏ ở hàng công cụ.
    - Mutation: dòng đang xử lý mờ đi và khóa menu; nút trong hộp thoại có `loading`.
    - Đổi tên: sửa ngay tại dòng (Enter lưu, Esc hủy) hoặc hộp thoại trên mobile; cập nhật lạc quan, lỗi thì trả lại tên cũ + toast.
    - Xóa: xóa mềm ngay, toast "Đã xóa … — Hoàn tác" (sonner action, ~6 s), không hộp xác nhận.
    - Lỗi tải: `Alert` ngay trong khối danh sách + nút "Thử lại".
    - Trạng thái rỗng (chưa có dự án) khác trạng thái không khớp tìm kiếm ("Không có dự án khớp "…"" + nút xóa tìm kiếm).
  - **Responsive, cuộn và kích thước:**
    - ≥ 640 px: `table-fixed` + `colgroup` cố định (Cập nhật ~128 px, Thao tác 48 px, Địa chỉ ~35%, Tên phần còn lại); dòng cao 48 px (52 px khi `pointer: coarse`).
    - < 640 px: cùng `table.getRowModel()` nhưng render dạng danh sách xếp chồng: tên (tối đa 2 dòng) · địa chỉ + thời gian (1 dòng meta) · nút thao tác 44 px. Không có bản dữ liệu thứ hai.
    - Tên/địa chỉ dài: `min-w-0` + `truncate`/`line-clamp-2`, tên đầy đủ trong `title`; dấu tiếng Việt không bị cắt (line-height ≥ 1.55).
    - Trang cuộn tự nhiên, không có khung cuộn lồng; hàng công cụ `sticky top-0` (nền paper, kẻ dưới) khi danh sách dài; `scrollbar-gutter: stable` để không xô ngang khi xuất hiện thanh cuộn.
    - Không phân trang, không ảo hóa (vài trăm dự án là nhiều). Vượt ~500 dòng thì cân nhắc `@tanstack/react-virtual`.
    - Kiểm ở 320 / 375 / 414 / 768 / 1280 px: không cuộn ngang, menu thao tác không tràn màn hình.
  - **Bàn phím:** Tab qua ô tìm → nút Tạo → từng dòng (link tên, nút thao tác); menu điều khiển bằng phím mũi tên.
- [ ] **Route `/`** dựng bằng giao diện P1 theo mục 3.5:
  - Bảng dự án như trên.
  - Hộp thoại "Tạo dự án" chọn 1 trong 2 bộ mẫu (`PRESETS` trong `src/domain/presets`).
  - Nhập dự án từ file JSON (chạy `migrate`).
  - Trạng thái rỗng.
- [ ] **Route `/projects/$id`:** khung màn soạn với `ssr: false`; nạp dự án, hiển thị tên và trạng thái lưu.

**Tiêu chí xong:** CRUD chạy với D1 local; tải lại trang vẫn còn dữ liệu; xóa rồi hoàn tác được.

---

### P4 — Form soạn thông số (3–4 ngày)

**Mục tiêu:** sửa được mọi thông số trong mục 2 của báo cáo; tự lưu; có phiên bản.

- [ ] **Form:** TanStack Form với validator Zod. Accordion 6 nhóm A–F, số đo nhập bằng ô mono có đơn vị "mm".
- [ ] **Danh sách tầng:**
  - Tự sinh theo số điểm dừng; khi đổi số điểm dừng thì hỏi trước nếu làm mất dòng đã sửa.
  - Mỗi dòng gồm tên, chiều cao, loại bao che, có cửa hay không.
- [ ] **Lịch sử hiệu chỉnh:** trường mảng 8 cột.
- [ ] **Panel "Tự tính"** (chỉ đọc): tổng chiều cao, lỗ chờ, móc treo, nhóm tầng, danh sách trang.
- [ ] **Lỗi và cảnh báo:**
  - Hiện ngay tại từng trường, kèm bản tổng hợp ở thanh trạng thái.
  - Có lỗi thì khóa nút **Tải PDF** và hiện lý do.
- [ ] **Tự lưu:**
  - Theo dõi thay đổi của form, chờ 1,5 giây sau khi ngừng gõ rồi gọi `saveProject`.
  - Trạng thái hiển thị: "Đang lưu…" / "Đã lưu 14:32" / "Lưu lỗi — Thử lại".
  - Chặn rời trang khi còn thay đổi chưa lưu.
- [ ] **Phiên bản:**
  - Panel danh sách phiên bản.
  - "Lưu phiên bản" kèm ghi chú.
  - "Khôi phục" (đưa phiên bản đó vào form).
  - "Đưa vào bảng hiệu chỉnh".
- [ ] **Xuất/nhập JSON:** file có `schemaVersion`; khi nhập thì chạy `migrate`.

**Tiêu chí xong:** sửa cả 2 bộ mẫu không lỗi; tải lại trang vẫn giữ đúng; lỗi và cảnh báo hiện đúng các trường hợp trong P2.

---

### P5 — Lõi vẽ, khung trang, trang chữ, xem trước, PDF (6.5–8.5 ngày)

**Mục tiêu:** chạy hết luồng `params → Prim[] → SVG → xem trước + PDF` cho bìa, DTP 01 và DTP 02, kèm khung trang A3.

**Lõi vẽ**
- [ ] `src/drawing/types.ts`: `Pt`, `Prim` (line, region, dim, leader, text, break, symbol, image), `Layer` gồm 3 cỡ nét 0.13 / 0.25 / 0.5 mm.
- [ ] `src/drawing/render-svg.tsx`: biến `Prim[]` thành phần tử SVG với `viewBox="0 0 420 297"` (đơn vị mm).
  - Ký hiệu chèn thẳng thành `<g transform>`, không dùng `<use>`, để svg2pdf xử lý chắc chắn.
  - Hatch là nét thật cắt theo `clipPath`, không dùng `<pattern>`.

**Font bản vẽ**
- [ ] Tinos TTF (Regular, Bold, Italic, BoldItalic) đặt trong `public/fonts/tinos/`.
- [ ] Dùng `@font-face` cho phần xem trước và đăng ký vào jsPDF cho phần PDF.
- [ ] Kiểm tra đủ dấu tiếng Việt.

**Đo chữ**
- [ ] `src/drawing/text-metrics.ts`: đo chữ bằng canvas sau khi Tinos đã tải (`document.fonts.load`). Dùng để co chữ cho vừa ô (địa chỉ rút gọn, ô bảng).

**Khung trang `src/drawing/frame/`**
- [ ] Viền A3, bảng hiệu chỉnh 8 cột.
- [ ] Khung tên gồm:
  - 6 ô loại hồ sơ, ô thỏa thuận chủ đầu tư.
  - Logo DTP + thông tin công ty lấy từ `src/config/company.ts`.
  - Duyệt / Kiểm tra / Thiết kế.
  - Tên công trình, địa chỉ rút gọn (tự co chữ), hạng mục, tên bản vẽ.
  - Vòng tròn DTP + số trang, số hiệu chỉnh, ngày.
- [ ] Lấy tọa độ thật từ PDF mẫu bằng `pdftotext -bbox-layout` để đặt chữ đúng chỗ.

**Trang chữ `src/drawing/sheets/`**
- [ ] `cover.tsx`: bìa.
- [ ] `responsibility.tsx`: DTP 01, chữ có chèn số liệu từ nhóm F + ghi chú thêm; sửa chính tả thành "TRÁCH NHIỆM".
- [ ] `spec.tsx`: DTP 02, bảng 12 dòng; mã hiệu là chữ tự do; tổng chiều cao in số hoặc "-- mm"; sửa thành "CABIN" và "Đặc tính".

**Ghép trang**
- [ ] `src/drawing/pages.ts`: từ danh sách trang đã tính, tạo ra component tương ứng kèm số trang.

**Giao diện xem trước** (hộp đèn graphite, mục 3.5)
- [ ] Cột thumbnail các trang và vùng xem chính có `react-zoom-pan-pinch` (vừa chiều rộng / 100% / kéo).
- [ ] Dùng `useDeferredValue` để gõ không giật.

**Xuất PDF `src/pdf/export-pdf.ts`**
- [ ] Nạp jsPDF + svg2pdf.js bằng dynamic import để không làm nặng bundle.
- [ ] A3 ngang, đơn vị mm; mỗi trang gọi `svg2pdf(svg, doc, { x: 0, y: 0, width: 420, height: 297 })`.
- [ ] Đăng ký font Tinos.
- [ ] **Thử nghiệm WebP:** nếu jsPDF không nhận WebP thì đổi sang PNG data URL bằng canvas trước khi nhúng.
- [ ] Tên file: `BV - <tên công trình> - <dd-mm-yyyy>.pdf` (bỏ ký tự không hợp lệ).
- [ ] Có chỉ báo tiến độ trong lúc xuất.

**Phục vụ kiểm tra tự động**
- [ ] Route `/dev/export` và script `scripts/export-preset.ts` (Playwright) xuất PDF từ bộ mẫu vào `.verify/`.
- [ ] Thêm script `yarn export:preset <preset>`, dùng cho `sheet-verifier`.
- [ ] Cài Playwright.

**Tiêu chí xong:**
- PDF mở được trong Preview và Acrobat, là vector, chữ tiếng Việt đúng.
- `sheet-verifier` báo bìa, 01 và 02 đạt OK hoặc lệch nhẹ với cả 2 bộ mẫu.
- Xem trước cập nhật dưới 100 ms mỗi lần gõ.

---

### P6 — Deploy + Cloudflare Access + sao lưu (0.5–1 ngày) → **Mốc M1**

- [ ] **(Bạn làm)** chạy `npx wrangler login` trong terminal tương tác.
- [ ] Chạy `npx wrangler d1 create elevator-db`, điền `database_id` vào `wrangler.jsonc`.
- [ ] Chạy `yarn db:migrate:remote`.
- [ ] Chạy `yarn deploy` → `https://elevator.<account>.workers.dev`.
- [ ] **(Bạn làm)** bật Cloudflare Access cho Worker trong dashboard (Workers & Pages → elevator → Settings → Domains & Routes → Enable Cloudflare Access):
  - Chính sách: chỉ cho **2 email**, đăng nhập bằng OTP.
  - Bảo vệ cả URL preview.
- [ ] Script `yarn db:backup`: `wrangler d1 export elevator-db --remote --output backups/<ngày>.sql`. Ghi chú thêm về D1 Time Travel 7 ngày.
- [ ] Kiểm tra nhanh trên bản production: tạo dự án → tự lưu → tải PDF.

**Tiêu chí xong:** người lạ không vào được; 2 email vào được; luồng chính chạy được trên production.

---

### P7 — Thư viện ký hiệu từ DWG (3–4 ngày, có thể làm song song từ sau P0)

Giao cho `symbol-extractor`.

- [ ] `tools/extract-symbols/`: `requirements.txt` (ezdxf, matplotlib), `extract.py`, `symbols.config.json` (block nguồn, vùng cắt, điểm chèn, trục kéo giãn), `README.md`.
- [ ] Đổi `.external/*.dwg` sang DXF bằng `dwg2dxf` vào `.out/`.
- [ ] Xuất **7 block** có sẵn: `car-side`, `landing-door-side`, `machine`, `rope-hitch`, `buffer-a`, `buffer-b`, `pit-ladder`.
- [ ] Cắt **~10 ký hiệu nét rời**: `rail-t-plan`, `counterweight-plan`, `door-co-plan`, `door-front`, `jamb-wide-jd320`, `jamb-narrow-35x50`, `call-box`, `floor-indicator`, `hook-plan`, `hook-detail`.
- [ ] Mỗi SVG: `viewBox` theo mm, gốc ở điểm chèn, chỉ có nét, không chữ và không kích thước.
- [ ] `src/drawing/symbols/index.ts`: danh mục ký hiệu, nạp SVG qua `?raw`, gồm kích thước, điểm chèn và trục kéo giãn.
- [ ] Route `/dev/symbols`: hiển thị toàn bộ ký hiệu kèm khung kích thước để kiểm tra bằng mắt.

**Tiêu chí xong:** đủ khoảng 17 ký hiệu; kích thước khớp bản vẽ (ví dụ cửa nhìn hông khớp HH 2100); `/dev/symbols` hiển thị sạch.

---

### P8 — Bộ phần tử vẽ cơ bản (3–4 ngày)

- [ ] `dimension.ts`: kích thước ngang / dọc / chuỗi; đầu kiểu gạch chéo hoặc mũi tên; chữ kiểu bộ 2 ("Chiều rộng = 1500", "LỖ CHỜ = 900"); chữ dọc xoay 90°.
- [ ] `hatch.ts`: hatch gạch (các hàng gạch so le) và bê tông (chấm + tam giác, sinh ngẫu nhiên có seed nên ra kết quả ổn định); cắt theo vùng.
- [ ] Các phần tử khác:
  - `leader.ts`: ghi chú nhiều dòng, có dấu `*`.
  - `break-line.ts`: đường ngắt.
  - `door-arrow.ts`: mũi tên chữ V kép + "Hướng cửa vào thang máy".
  - `section-mark.ts`: ký hiệu A/B/C.
  - `table.ts`: bảng.
- [ ] `fit-scale.ts`: chọn tỷ lệ trong [1:10, 1:20, 1:25, 1:50, 1:75, 1:100] sao cho vừa vùng vẽ; trả về phép biến đổi.
- [ ] Route `/dev/primitives`: bộ sưu tập phần tử.
- [ ] Test: kết quả ổn định giữa các lần chạy, tọa độ hữu hạn, chữ kích thước đúng.

**Tiêu chí xong:** bộ sưu tập hiển thị đúng; test xanh.

---

### P9 — Mặt cắt ngang, pit, phòng máy (4–6 ngày) → **Mốc M2**

- [ ] **`sheets/plan.tsx`** (mẫu DTP 03, xuất là DTP 03):
  - Hố AH×BH, tường 200, cột bê tông 4 góc.
  - Cabin canh giữa; ray hai bên; đối trọng ở vách sau; cửa và ngưỡng ở vách trước.
  - Lỗ chờ + hai bên; kích thước bao ngoài.
  - Ghi chú "Xây chèn sau…" nếu bật; mũi tên hướng cửa.
- [ ] **`sheets/pit.tsx`** (mẫu 05, xuất 04): mặt cắt đứng pit theo PIT, mặt bằng pit AH×BH, ghi chú chống thấm.
- [ ] **`sheets/machine-room.tsx`** (mẫu 09, xuất 08):
  - Hố, tường, CPM ở vách trước (cùng giá trị với trang mặt cắt đứng).
  - Móc treo ở tâm hố, có kích thước định vị.
  - Dầm đặt máy 3 phía nếu chọn kiểu dầm.
- [ ] `sheet-verifier` so với cả 2 bộ mẫu. Thử thêm với thông số lạ (AH 2200, OP 900…) để chắc hình co giãn đúng.

**Tiêu chí xong:** 3 trang đạt OK hoặc lệch nhẹ với cả 2 bộ; thông số lạ vẫn ra hình hợp lý.

---

### P10 — Cửa tầng (2–3 ngày)

- [ ] **`sheets/landing-door.tsx`**, một component nhận tham số loại bao che:
  - Mặt đứng chừa thô: lỗ chờ, hai bên, cao 2300, lanh tô 200, lỗ hộp nút 100×400 @1100.
  - Mặt đứng hoàn thiện: HH, OP, khung bao che, hộp nút, hộp hiển thị tầng (bao che rộng).
  - 2 mặt bằng tương ứng.
  - Tiêu đề "Tầng 1F : bao che rộng" / "Tầng 2F ~ 5F : bao che hẹp" sinh từ danh sách tầng.
- [ ] Mỗi loại bao che đang dùng một trang; số trang dồn đúng.

**Tiêu chí xong:** trang 06 và 07 khớp cả 2 bộ; trường hợp chỉ có bao che hẹp thì ra 1 trang.

---

### P11 — Mặt cắt đứng + biến thể (6–9 ngày) → **Mốc M3**

- [ ] **Bố cục dọc:** các mức tầng theo nhóm hiển thị; tỷ lệ dọc riêng; đường ngắt ở chỗ gộp; ký hiệu mặt cắt A/B/C.
- [ ] **Mỗi mức tầng:**
  - Sàn, dầm kiềng (cỡ của các tầng), dầm đầu cửa 200×200.
  - Lỗ chờ 2300 / HH 2100.
  - Đà giữa tầng (cách 1500 ở tầng trên cùng, 1600 ở tầng khác).
  - Nhãn "THEO THỰC TẾ" và tên tầng.
- [ ] **Buồng trên cùng** (luôn vẽ):
  - Tên lấy từ form, chiều cao buồng.
  - Dầm kiềng mái, CPM, móc treo 2 tấn, ký hiệu máy kéo.
  - Kiểu đỡ máy: sàn đặt máy 200×200 hoặc vị trí đặt máy + dầm.
- [ ] **Pit:** giảm chấn, thang xuống pit.
- [ ] **Hình nhìn hông (BH):** cụm cabin ở tầng trên cùng, cánh cửa nhìn hông ở các tầng.
- [ ] **Hình nhìn trước (AH):** cánh cửa nhìn trước, hộp nút; tầng 1F có khung bao che rộng.
- [ ] **Phía phải trang:** bảng chiều cao tầng (gộp theo câu 14) và chi tiết móc palăng Ø18.
- [ ] Đặt leader ghi chú sao cho không chồng lên nhau.
- [ ] Biến thể của bộ 2: dầm kiềng 2 cỡ, dầm đặt máy, bảng có số.
- [ ] Kiểm tra với N = 3, 4, 5, 9, 20 và cả 2 bộ mẫu (`sheet-verifier`).

**Tiêu chí xong:** đủ 9 trang khớp cả 2 bộ mẫu; với 20 tầng vẫn vừa khổ A3.

---

### P12 — Kiểm thử tổng & hoàn thiện (2–3 ngày)

- [ ] **Playwright:**
  - Luồng chính: tạo → sửa → tự lưu → phiên bản → tải PDF.
  - So ảnh từng trang của bản xuất với ảnh chuẩn do chính app tạo (để phát hiện thay đổi ngoài ý muốn).
  - So với PDF mẫu (người xem duyệt).
- [ ] **Trường hợp biên:** N từ 2 đến 30; tên rất dài; thiếu chiều cao tầng; bật/tắt các công tắc; nhập JSON phiên bản cũ.
- [ ] **Hiệu năng:**
  - Xem trước dưới 100 ms mỗi lần gõ; xuất 9 trang dưới 5 giây.
  - Bundle ban đầu không chứa jsPDF.
  - CPU của Worker dưới 10 ms (kiểm bằng `wrangler tail`).
- [ ] **Hoàn thiện giao diện:**
  - Trạng thái rỗng, lỗi mạng, phím tắt.
  - Rà lại toàn bộ chữ tiếng Việt.
  - Slop test Hallmark lần 2.
  - Kiểm tra ở 320–768px.
- [ ] **Tài liệu:** README (cách cập nhật ký hiệu, sao lưu, deploy), cập nhật `CLAUDE.md`.
- [ ] `code-reviewer` soát toàn bộ.

---

### P13 — Bàn giao & vận hành (~0.5 ngày + thời gian dùng thử)

- [ ] Deploy bản cuối, chạy migration remote, kiểm tra Access với 2 email.
- [ ] **(Bạn làm)** dùng thử với 1–2 dự án thật, so với bản CAD; ghi lại danh sách góp ý.
- [ ] Sửa các góp ý trong phạm vi MVP.
- [ ] Lịch sao lưu: chạy `yarn db:backup` hằng tháng; ghi chú về Time Travel.
- [ ] Gắn tag `v1.0.0`.

---

## 5. Việc bạn cần làm

| Khi nào | Việc |
|---|---|
| P6 | `npx wrangler login` (cần trình duyệt); xác nhận tài khoản Cloudflare dùng cho dự án |
| P6 | Bật Cloudflare Access, nhập **2 email** được phép |
| P5 | Xác nhận thông tin công ty DTP in trên khung tên (tên, địa chỉ, điện thoại) vẫn như bản vẽ mẫu |
| P13 | Dùng thử với dự án thật và gửi góp ý |
| Bất kỳ lúc nào | Nếu có logo E-TECH khổ lớn hơn (≥ 1200px) thì gửi để dùng cho bản in sau này |

## 6. Rủi ro & cách giảm

| Rủi ro | Cách giảm |
|---|---|
| svg2pdf hiển thị khác trình duyệt (font, clipPath, ảnh WebP) | Thử sớm ở P5; không dùng `<pattern>` và `<use>`; nếu WebP lỗi thì đổi sang PNG bằng canvas |
| Đo chữ ở trình duyệt khác với PDF | Đo bằng canvas với đúng font Tinos; chừa khoảng an toàn 2–3% |
| Mặt cắt đứng phức tạp, ghi chú chồng nhau | Làm cuối (P11) khi đã có đủ phần tử; quy tắc đặt ghi chú cố định; test với N = 20 |
| Ký hiệu nét rời cắt ra bị thiếu hoặc thừa nét | Cấu hình vùng cắt trong JSON; xem lại ở `/dev/symbols`; dọn tay nếu cần |
| CPU của Worker vượt 10 ms | `ssr: false` ở màn soạn; server chỉ đọc/ghi JSON; kiểm bằng `wrangler tail` |
| Dấu tiếng Việt bị cắt | Line-height theo mục 3.4; kiểm tra chữ có dấu chồng ở mọi cỡ |

## 7. Sau MVP

- Loại thang khác: thang hàng, cabin thông hai cửa, đối trọng đặt hông (+3–6 ngày mỗi loại).
- Ký hiệu máy kéo riêng cho từng hãng.
- Chọn logo/công ty theo dự án (DTP hoặc E-TECH).
- Xuất DXF (hiện chưa cần).

---

## Phụ lục A — Cây thư mục mục tiêu

```
src/
  routes/          __root.tsx · index.tsx (danh sách) · projects.$id.tsx (màn soạn, ssr:false) · dev.ui.tsx, dev.symbols.tsx… (route phẳng, chỉ DEV)
  db/              schema.ts · index.ts (drizzle-orm/d1)
  server/          projects.ts (createServerFn)
  domain/          schema.ts · presets/ · derive.ts · rules.ts · migrate.ts
  drawing/         types.ts · render-svg.tsx · text-metrics.ts · primitives/ · symbols/ · frame/ · sheets/ · pages.ts
  pdf/             export-pdf.ts · fonts.ts
  features/        projects/ (danh sách, hộp thoại, queries) · editor/ (các nhóm form, preview, autosave)
  components/      ui/ (shadcn đã chỉnh theo Cobalt) · app/ (brand-mark, save-status)
  config/          company.ts (thông tin DTP, đường dẫn logo)
  tests/           unit test Vitest, cấu trúc gương của src/ (domain/derive.test.ts · drawing/sheets/… · lib/…)
  tokens.css · styles.css
public/            brand/*.webp · fonts/tinos/*.ttf · favicon.ico
assets/brand/      PNG gốc (không phục vụ trên web)
tools/extract-symbols/
scripts/           export-preset.ts
tests/e2e/         Playwright
docs/              báo cáo · super-plan.md
drizzle/           migration SQL
design.md          hệ thống thiết kế đã khóa (Hallmark)
.hallmark/         log.json
.external/         (gitignore) DWG · reference/ (2 PDF mẫu)
```

## Phụ lục B — Script

| Script | Lệnh |
|---|---|
| `dev` | `vite dev --port 3000` (có D1 local qua Cloudflare vite plugin) |
| `build` / `preview` | `vite build` / `vite preview` |
| `deploy` | `yarn build && wrangler deploy` |
| `typecheck` | `tsc --noEmit` |
| `lint` / `format` | `eslint` / `prettier --write . && eslint --fix` |
| `test` / `test:watch` | `vitest run` / `vitest` |
| `test:e2e` | `playwright test` (thêm ở P5) |
| `export:preset` | `tsx scripts/export-preset.ts` (thêm ở P5) |
| `cf-typegen` | `wrangler types` |
| `db:generate` | `drizzle-kit generate` |
| `db:migrate:local` / `db:migrate:remote` | `wrangler d1 migrations apply elevator-db --local` / `--remote` |
| `db:backup` | `wrangler d1 export elevator-db --remote --output backups/<ngày>.sql` |

## Phụ lục C — Đối chiếu số trang

| PDF mẫu | Web xuất | Trang |
|---|---|---|
| Bìa | Bìa | Bìa |
| 01 | 01 | Hạng mục trách nhiệm |
| 02 | 02 | Đặc tính kỹ thuật |
| 03 | 03 | Mặt cắt ngang thang máy |
| 05 | 04 | Mặt cắt pit (C-C) |
| 06 | 05 | Mặt cắt đứng hố thang |
| 07 | 06 | Cửa tầng – bao che rộng |
| 08 | 07 | Cửa tầng – bao che hẹp |
| 09 | 08 | Mặt cắt ngang phòng máy (B-B) |
