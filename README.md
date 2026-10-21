# Bản vẽ thang máy

Web nội bộ dùng để tạo bộ bản vẽ xây dựng thang máy (PDF khổ A3) từ form thông số. Dự án được lưu trên Cloudflare D1, còn phần xem trước và xuất PDF chạy trên trình duyệt.

- Báo cáo giải pháp: [`docs/bao-cao-giai-phap-web-ban-ve-thang-may.md`](docs/bao-cao-giai-phap-web-ban-ve-thang-may.md)
- Kế hoạch đầy đủ theo từng phase: [`docs/super-plan.md`](docs/super-plan.md)

## Cài đặt

Dùng **yarn 1** (không dùng npm hay pnpm, để không sinh thêm file lock khác).

```bash
yarn install
yarn db:migrate:local   # tạo bảng trong D1 local (.wrangler/)
yarn dev                # http://localhost:3000
```

## Script

| Lệnh | Việc |
|---|---|
| `yarn dev` | Chạy dev server, có D1 local qua Cloudflare vite plugin |
| `yarn build` / `yarn preview` | Build / chạy thử bản build |
| `yarn typecheck` · `yarn lint` · `yarn test` | Kiểm tra kiểu · lint · unit test (Vitest) |
| `yarn db:generate` | Sinh migration SQL từ `src/db/schema.ts` vào `drizzle/` |
| `yarn db:migrate:local` / `yarn db:migrate:remote` | Áp dụng migration lên D1 local / production |
| `yarn cf-typegen` | Sinh lại kiểu `Env` sau khi sửa `wrangler.jsonc` |
| `yarn deploy` | Build và deploy lên Cloudflare Workers |
| `yarn db:backup` | Tải bản sao D1 production về `backups/` |

Thêm component shadcn bằng `npx shadcn@latest add <tên>`. CLI tự nhận ra yarn.

## Thư mục

| Thư mục | Nội dung |
|---|---|
| `src/` | Mã nguồn (alias `#/`) |
| `drizzle/` | Migration SQL cho D1 |
| `public/brand/` | Logo WebP được phục vụ trên web |
| `assets/brand/` | Logo PNG/ICO gốc, không phục vụ trên web |
| `docs/` | Báo cáo + super plan |
| `.external/` | (không commit) DWG gốc và `reference/` chứa 2 PDF mẫu có thông tin khách hàng |

## Deploy lần đầu

Xem phase **P6** trong super plan. Tóm tắt:
1. `npx wrangler login`
2. `npx wrangler d1 create elevator-db`, rồi điền `database_id` vào `wrangler.jsonc`
3. `yarn db:migrate:remote`
4. `yarn deploy`
5. Bật Cloudflare Access cho Worker, chỉ cho phép 2 email
