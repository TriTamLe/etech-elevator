# Sổ tay vận hành

Cách deploy, quản lý người được vào, sao lưu và khôi phục bản đang chạy trên Cloudflare.

App chạy trên **Cloudflare Workers + D1**, tài khoản Cloudflare cá nhân của người phát triển (quyết định C2 trong `docs/cau-hoi-can-chot.md`). Địa chỉ là `https://elevator.<subdomain>.workers.dev`. Repo không ghi email, account id hay subdomain thật.

Mọi lệnh dưới đây chạy ở thư mục gốc của repo, sau khi đã `npx wrangler login` (kiểm bằng `npx wrangler whoami`).

## Deploy bản mới

1. `yarn lint && yarn typecheck && yarn test`
2. Nếu có migration mới trong `drizzle/` (sau `yarn db:generate`): chạy `yarn db:backup` rồi `yarn db:migrate:remote`, **trước** khi deploy.
3. `yarn deploy` (build rồi `wrangler deploy`).
4. Mở app, thử nhanh: danh sách dự án → mở một dự án → tải PDF.

Muốn quay lại bản code trước:
- `npx wrangler rollback`: quay về bản deploy **ngay trước**, có hỏi xác nhận.
- Muốn về bản cũ hơn: `npx wrangler versions list` để lấy id, rồi `npx wrangler rollback <version-id>`.

Rollback chỉ đổi code, **không đổi dữ liệu D1**, và migration đã chạy cũng không tự lùi lại. Vì vậy **không rollback qua một lần nâng `schemaVersion` hoặc một migration D1**: code cũ sẽ báo lỗi "mới hơn phiên bản web đang hỗ trợ" với mọi dự án đã lưu ở schema mới. Nếu bắt buộc phải lùi, khôi phục cả D1 bằng Time Travel về trước lúc deploy (mục Khôi phục).

**Khi nâng `schemaVersion` của params:** tab nào còn mở code cũ sẽ tự lưu thất bại, vì server chỉ nhận phiên bản mới. Báo người dùng tải lại trang sau mỗi lần deploy có nâng schema. Ở super-plan, mục P6 có ghi việc cần làm cho trường hợp này.

## Ai được vào app

App không có code đăng nhập. **Cloudflare Access** chặn mọi request trước khi tới Worker, kể cả file tĩnh. Người được vào đăng nhập bằng **One-time PIN**: họ nhập email và nhận mã qua email. Họ không cần tài khoản Cloudflare và không thấy gì trong tài khoản của chủ app.

Cấu hình hiện tại, ghi theo giao diện dashboard tháng 10/2026:

1. **Workers & Pages → elevator → tab Access:** "Worker Access", Scope **All traffic**. Authentication policy là policy danh sách email ở bước 2.
   - Hộp thoại này chỉ có 2 mẫu dựng sẵn ("Cloudflare account", "Email domain"). **Đừng dùng "Email domain" với một địa chỉ email đầy đủ**: kiểu này so phần đuôi sau `@`, nên không ai khớp.
2. **Zero Trust → Access controls → Policies:** policy **Allow**, **Include → Emails**, liệt kê từng email được vào. Policy tạo ở đây sẽ hiện trong mục "Access policies" của hộp thoại ở bước 1.
3. **Zero Trust → Integrations → Identity providers:** có **One-time PIN**.
   - Application "elevator - Cloudflare Workers" (Access controls → Applications → Login methods) để **Accept all available identity providers** và tắt **Apply instant authentication**.

**Thêm hoặc bớt người:** sửa danh sách **Emails** trong policy ở bước 2. Không cần sửa code hay deploy lại.

Tự kiểm tra người lạ có bị chặn không (không cần đăng nhập):

```sh
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://elevator.<subdomain>.workers.dev/
# Phải là 302 sang https://<team>.cloudflareaccess.com/...
```

Sau khi đổi cấu hình Access, đợi khoảng 1–2 phút để thay đổi có hiệu lực.

URL preview theo từng version đã tắt (`"preview_urls": false` trong `wrangler.jsonc`), nên chỉ còn một địa chỉ cần bảo vệ. Nếu sau này gắn custom domain hoặc bật lại `preview_urls`, phải kiểm lại Access cho địa chỉ mới bằng lệnh curl ở trên.

## Sao lưu

- **Hằng tháng** và **trước mỗi lần chạy migration**, chạy `yarn db:backup`.
  - Lệnh ghi `backups/elevator-db-<yyyy-mm-dd>.sql`. Thư mục này đã git-ignore và không commit, vì có dữ liệu dự án.
  - Nên chép file ra một nơi khác máy (ổ đám mây cá nhân).
- **D1 Time Travel** có sẵn, không cần bật: khôi phục được về bất kỳ thời điểm nào trong **7 ngày** gần nhất (gói free).

## Khôi phục

- **Về một thời điểm trong 7 ngày gần nhất:**

  ```sh
  npx wrangler d1 time-travel info elevator-db                       # bookmark hiện tại
  npx wrangler d1 time-travel restore elevator-db --timestamp=2026-11-02T08:00:00+07:00
  ```

  Restore ghi đè toàn bộ database. Lệnh in ra bookmark của trạng thái trước khi restore, giữ lại bookmark này để quay lại được nếu chọn nhầm.
- **Từ file backup `.sql`:** dùng khi lỗi đã quá 7 ngày, hoặc phải dựng lại database.
  1. Tạo database mới cùng vùng với bản đang chạy: `npx wrangler d1 create elevator-db-restore --location apac`.
  2. Nạp file: `npx wrangler d1 execute elevator-db-restore --remote --file=backups/elevator-db-<ngày>.sql`.
  3. Kiểm dữ liệu.
  4. Trong `wrangler.jsonc`, **chỉ đổi `database_id`** sang id của database mới; **giữ nguyên `"database_name": "elevator-db"`**. Các script `db:*` gọi theo tên `elevator-db`; nếu đổi tên, wrangler sẽ trỏ về database cũ.
  5. `yarn db:migrate:remote`: chỉ chạy các migration còn thiếu nếu file backup cũ hơn migration mới nhất. Bảng `d1_migrations` có sẵn trong file.
  6. `yarn deploy`.

## Xem log và CPU

- Log trực tiếp: `npx wrangler tail`, rồi thao tác trên app.
- Lịch sử log và CPU time: dashboard → **Workers & Pages → elevator → Observability** (đã bật bằng `"observability"` trong `wrangler.jsonc`).
- Gói free giới hạn **10 ms CPU** cho mỗi request.
  - Lần đo đầu (28/10/2026, 21 request, tất cả 200): trung vị 3 ms; cao nhất 14 ms ở một server function `POST` lúc tạo dự án, request đầu tiên sau khi Worker khởi động lạnh.
  - Người dùng gặp request vượt CPU sẽ thấy lỗi **1102**. Trong `wrangler tail --format json` hoặc Observability, lọc theo `outcome = exceededCpu`.
  - Khoảng 1 tuần sau khi PO dùng thật, xem lại CPU p99 ở **Workers & Pages → elevator → Metrics**.
  - Nếu lỗi lặp lại ở trang SSR (danh sách dự án), hướng xử lý đầu tiên là giảm phần render trên server của route đó, chưa cần đụng D1. Danh sách dự án không đọc cột `params` để giữ dưới giới hạn này; mọi việc nặng (vẽ, xuất PDF) chạy trong trình duyệt.

## Chi phí

Workers, D1 và Access (tối đa 50 người dùng) đều trong gói free. Nếu sau này vượt gói free, chi phí gửi bill cho PO (C2).
