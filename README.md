# Bản vẽ thang máy

Web nội bộ dùng để tạo bộ bản vẽ xây dựng thang máy (PDF khổ A3) từ form thông số. Người dùng chọn một bộ mẫu, sửa thông số trong màn soạn và xem trước từng trang. Sau đó tải về bộ PDF giống bản CAD mẫu của DTP.

- **Chạy ở đâu:** Cloudflare Workers, dự án lưu trong D1. Phần xem trước và xuất PDF chạy trên trình duyệt (jsPDF + svg2pdf.js).
- **Ai được vào:** Cloudflare Access quyết định. Repo không có code đăng nhập.
- **Tài liệu:**
  - Báo cáo giải pháp (luật nghiệp vụ, các quyết định đã chốt): [`docs/bao-cao-giai-phap-web-ban-ve-thang-may.md`](docs/bao-cao-giai-phap-web-ban-ve-thang-may.md)
  - Kế hoạch theo từng phase: [`docs/super-plan.md`](docs/super-plan.md)
  - Vận hành bản thật (deploy, ai được vào, sao lưu, khôi phục, log): [`docs/van-hanh.md`](docs/van-hanh.md)
  - Quy ước code (cho người và cho AI): [`CLAUDE.md`](CLAUDE.md)

## Cài đặt

Cần:
- Node 22 (bản đang dùng khi phát triển; repo chưa ghim phiên bản);
- **yarn 1**: không dùng npm hay pnpm, để không sinh thêm file lock khác.

```bash
yarn install
yarn db:migrate:local   # tạo bảng trong D1 local (.wrangler/)
yarn dev                # http://localhost:3000
```

Chỉ cần khi làm những việc sau:
- **Chạy E2E:** Google Chrome đã cài trên máy (Playwright dùng Chrome có sẵn, không tải trình duyệt riêng), và poppler cho `pdftoppm`, `pdfinfo` (`brew install poppler`).
- **Sinh lại ký hiệu từ DWG:** Python 3 và libredwg (`brew install libredwg`). Xem mục [Cập nhật ký hiệu](#cập-nhật-ký-hiệu).

## Script

| Lệnh | Việc |
|---|---|
| `yarn dev` | Dev server cổng 3000, có D1 local qua Cloudflare vite plugin |
| `yarn build` / `yarn preview` | Build / chạy thử bản build |
| `yarn typecheck` · `yarn lint` · `yarn format:check` | Kiểm kiểu · ESLint (có jsx-a11y) · Prettier. Cùng `yarn test`, cả bốn phải sạch trước khi commit |
| `yarn format` | Prettier ghi lại file, rồi `eslint --fix` |
| `yarn test` / `yarn test:watch` | Unit test (Vitest) |
| `yarn test:e2e` | E2E (Playwright), không gồm bài đo thời gian |
| `yarn test:e2e:update` | Như trên, đồng thời ghi lại ảnh chuẩn của các trang bản vẽ |
| `yarn test:e2e:perf` | Chỉ các bài đo thời gian `@perf`: gõ phím, xuất PDF |
| `yarn export:preset [hotel-9f\|house-5f\|all]` | Xuất PDF của bộ mẫu ra `.verify/` qua dev server đang chạy |
| `yarn gen:symbols` | Sinh lại `src/drawing/symbols/data/` từ DWG mẫu |
| `yarn gen:font-metrics` | Sinh lại bảng độ rộng chữ Tinos (`src/drawing/fonts/`) |
| `yarn db:generate` | Sinh migration SQL từ `src/db/schema.ts` vào `drizzle/` |
| `yarn db:migrate:local` / `yarn db:migrate:remote` | Áp dụng migration lên D1 local / production |
| `yarn db:backup` | Tải bản sao D1 production về `backups/` |
| `yarn cf-typegen` | Sinh lại kiểu `Env` sau khi sửa `wrangler.jsonc` |
| `yarn deploy` | Build rồi deploy lên Cloudflare Workers (quy trình: `docs/van-hanh.md`) |
| `yarn generate-routes` | Sinh lại `src/routeTree.gen.ts` (dev server cũng tự làm) |

Thêm component shadcn bằng `npx shadcn@latest add <tên>`. CLI tự nhận ra yarn.

## Kiểm thử

- **Unit:** test nằm ở `src/tests/`, mirror theo cấu trúc `src/`. Ví dụ, `src/domain/derive.ts` có test là `src/tests/domain/derive.test.ts`.
- **E2E:** test nằm ở `tests/e2e/`.
  - Playwright tự bật dev server ở cổng 3100 với một D1 riêng (`.wrangler/e2e`), xóa và migrate lại mỗi lần chạy, nên D1 dev không bị đụng tới.
  - Các bài chính: luồng tạo, sửa, lưu, phiên bản, tải PDF; danh sách dự án; nhập JSON cũ; mất mạng; phím tắt; bố cục ở 320, 375, 768 và 1024 px.
  - `sheets.spec.ts` so PDF của 2 bộ mẫu với 18 ảnh chuẩn trong `tests/e2e/__snapshots__/`. Khi **chủ ý** đổi hình vẽ, chạy `yarn test:e2e:update` rồi commit các ảnh mới.
  - Xem log của dev server: `DEBUG=pw:webserver yarn test:e2e`. Trên macOS nên chạy dưới `caffeinate -i`, vì máy ngủ giữa chừng sẽ làm test hết giờ.
- **So với bản CAD mẫu:** do người xem hoặc agent `sheet-verifier` làm. Hai PDF mẫu nằm trong `.external/` (không commit).

## Thư mục

| Thư mục | Nội dung |
|---|---|
| `src/domain/` | Schema Zod của thông số, giá trị tự tính (`derive.ts`), luật kiểm tra, bộ mẫu, nâng cấp schema |
| `src/drawing/` | Hàm vẽ thuần `params → Prim[]`: các trang (`sheets/`), khung tên, phần tử vẽ (kích thước, hatch…), ký hiệu từ DWG, render SVG |
| `src/pdf/` | Xuất PDF trên trình duyệt từ cùng các Prim của phần xem trước |
| `src/features/` | Màn soạn (`editor/`) và danh sách dự án (`projects/`) |
| `src/server/`, `src/db/` | Server function và truy vấn D1 (Drizzle) |
| `src/components/` | Component giao diện: `ui/` (shadcn đã chỉnh) và `app/` |
| `src/config/` | Thông tin công ty in trên bản vẽ, tên app và các câu dùng chung |
| `src/routes/` | Route (TanStack Router, file phẳng) |
| `tests/e2e/` | E2E, fixture và ảnh chuẩn |
| `tools/extract-symbols/` | Script Python lấy ký hiệu từ DWG |
| `drizzle/` | Migration SQL cho D1 |
| `public/brand/` | Logo WebP được phục vụ trên web |
| `assets/brand/` | Logo PNG/ICO gốc, không phục vụ trên web |
| `docs/` | Báo cáo, super plan, sổ tay vận hành |
| `.external/` | Không commit: DWG gốc và `reference/` chứa 2 PDF mẫu có thông tin khách hàng |

## Cập nhật ký hiệu

Các ký hiệu (cabin, máy, cửa, bao che…) được lấy từ DWG mẫu, không vẽ tay.

1. Đặt DWG mới vào `.external/`.
2. Sửa `tools/extract-symbols/symbols.config.json` nếu cần thêm hoặc đổi ký hiệu.
3. Chạy `yarn gen:symbols`, rồi `yarn typecheck` và `yarn test:e2e`. Nếu hình vẽ đổi đúng ý thì chạy `yarn test:e2e:update`.

Cách cài môi trường Python và chi tiết cấu hình: [`tools/extract-symbols/README.md`](tools/extract-symbols/README.md). Không sửa tay các file trong `src/drawing/symbols/data/`.

## Vận hành

Deploy, migrate D1 production, quản lý người được vào, sao lưu, khôi phục và xem log CPU: xem [`docs/van-hanh.md`](docs/van-hanh.md).

## `git blame`

Commit định dạng toàn repo (P12d) được ghi trong `.git-blame-ignore-revs`. GitHub tự bỏ qua commit đó. Muốn `git blame` trên máy cũng bỏ qua, chạy một lần:

```bash
git config blame.ignoreRevsFile .git-blame-ignore-revs
```
