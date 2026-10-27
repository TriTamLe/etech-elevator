# Mini plan P5c — Xuất PDF, mở khóa "Tải PDF", Playwright, sheet-verifier

Lập ngày 27/10/2026, sau P5b (`5d747fc`). Đã làm ngày 27/10/2026 — kết quả ghi ở `docs/super-plan.md` (P5, "Kết quả 5c"). Đợt 5c nằm trong P5 của `docs/super-plan.md`.

## Mục tiêu
- Tải được PDF vector A3 ngang gồm các trang đã sẵn sàng (Bìa, DTP 01, DTP 02). PDF dựng từ đúng SVG của bản xem trước; không có nhánh vẽ riêng cho PDF.
- Có lệnh `yarn export:preset <preset>` để `sheet-verifier` so tự động với 2 bộ mẫu.

## Hiện trạng có thể dùng lại
- `renderPage` / `readyPages` (`src/drawing/pages.ts`) và `SheetSvg` (`src/drawing/render-svg.tsx`, phần tử SVG thuần, an toàn cho svg2pdf).
- Font TTF trong `public/fonts/tinos/`.
- Logo `public/brand/dtp-logo.webp`.
- Nút "Tải PDF" (`src/features/editor/editor-header.tsx`) đang để `aria-disabled` kèm lý do: "Xuất PDF sắp có." hoặc "Còn N lỗi…".
- `collectIssues` cho biết có lỗi chặn hay không. Quy tắc: lỗi luật chặn PDF, cảnh báo thì không.
- `derive().pages` (mã DTP) và `project.name`.

## Thiết kế

**1. `src/pdf/export-pdf.ts`**
- Nạp `jspdf` và `svg2pdf.js` bằng dynamic import để không làm nặng bundle chính. Thêm 2 gói này bằng `yarn add`, chọn bản đã phát hành trên 2 tuần.
- `exportPdf(params, { onProgress })`:
  - `derive`, rồi `readyPages`.
  - Với mỗi trang: dựng `<svg>` bằng `renderToStaticMarkup(<SheetSvg …/>)`, parse thành phần tử DOM, gắn tạm vào một container ẩn (svg2pdf cần đo chữ), rồi `doc.svg(el, { x: 0, y: 0, width: 420, height: 297 })`.
  - `new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' })`; thêm trang trước mỗi trang sau trang đầu.
  - Gọi `onProgress(i, n)` sau mỗi trang.
- Trả về `Blob`. Hàm thuần phía trình duyệt, không động tới React state.

**2. Font**
- Đọc 4 file TTF bằng `fetch`, chuyển base64, rồi `addFileToVFS` và `addFont('Tinos-…', 'Tinos', 'normal' | 'bold' | 'italic' | 'bolditalic')`. Cache lại sau lần đầu.
- **Kiểm (còn mở từ 5a):** svg2pdf có chọn đúng Tinos Bold khi SVG ghi `font-weight="bold"` không, và dấu tiếng Việt có hiện đúng không (cần font Identity-H; jsPDF có làm điều này với TTF đã nhúng không).

**3. Logo WebP**
- **Thử nghiệm trước tiên:** jsPDF/svg2pdf có nhận `<image href=".webp">` không.
- Nếu không: trước khi xuất, đổi WebP sang PNG data URL bằng canvas (độ phân giải gốc 1298 px) và thay `href` trong phần tử dùng cho PDF.
- Không đổi file nguồn trong `public/`.

**4. Tên file**
- `BV - <tên công trình> - <dd-mm-yyyy>.pdf`, bỏ ký tự cấm `\ / : * ? " < > |` và rút gọn khoảng trắng.
- Ngày theo `Asia/Ho_Chi_Minh` qua `src/lib/format.ts` (thêm `formatFileDate`).
- Có test.

**5. Nút "Tải PDF"** (`editor-header.tsx`)
- Mở khóa khi `issues.params` hợp lệ và không có lỗi luật.
- Bấm thì xuất từ **params hiện tại**, không dùng bản deferred.
- Trong lúc xuất:
  - nút `aria-busy` và hiện "Đang xuất 2/3…" (có `aria-live`);
  - không cho bấm lại.
- Xong thì tải file xuống (dùng `URL.createObjectURL`, nhớ thu hồi). Lỗi thì toast tiếng Việt kèm "Thử lại".
- Giữ nguyên các lý do bị khóa ở tooltip.

**6. Kiểm tra tự động**
- **Route `src/routes/dev.export.tsx`** (chỉ chạy ở DEV, `ssr: false`):
  - Nhận `?preset=hotel-9f|house-5f`, gọi `exportPdf`.
  - Đặt Blob lên `window.__pdf` (base64) và gắn `data-ready` khi xong.
- **`scripts/export-preset.ts`** (Playwright, dev dependency):
  - Mở `http://localhost:3001/dev/export?preset=…`, chờ `data-ready`, rồi ghi file vào `.verify/<preset>.pdf`.
  - Lệnh: `yarn export:preset <preset>` (cần `yarn dev` đang chạy, hoặc script tự khởi động dev server).
- **`.claude/agents/sheet-verifier.md`:** đổi tên preset thành `hotel-9f` / `house-5f`, khớp với code; ghi rõ ở 5c chỉ so Bìa, DTP 01, DTP 02.

**7. Tài liệu**
- `docs/super-plan.md`: đánh dấu các mục 5c và ghi kết quả.
- `CLAUDE.md`: thêm lệnh `yarn export:preset`.

## File
- **Mới:**
  - `src/pdf/export-pdf.ts`
  - `src/pdf/fonts.ts`
  - `src/pdf/file-name.ts` (hoặc gộp vào `format.ts`)
  - `src/routes/dev.export.tsx`
  - `scripts/export-preset.ts`
  - test `src/tests/pdf/file-name.test.ts`
- **Sửa:**
  - `src/features/editor/editor-header.tsx` (có thể thêm hook `use-export-pdf.ts`)
  - `src/lib/format.ts`
  - `package.json` (`jspdf`, `svg2pdf.js`, `playwright` dev, script `export:preset`)
  - `.gitignore` (`.verify/` đã có)
  - `sheet-verifier.md`, `super-plan.md`, `CLAUDE.md`

## Kiểm tra
- `yarn lint`, `yarn typecheck`, `yarn test`, `yarn build`.
  - Kiểm thêm: kích thước bundle chính không tăng, vì jsPDF chỉ nằm trong chunk tách riêng.
- `yarn export:preset house-5f` và `hotel-9f` ra 2 file PDF trong `.verify/`.
- `pdffonts`: có Tinos được nhúng.
- `pdftotext`: đọc ra đúng chữ tiếng Việt.
- `pdfinfo`: A3 ngang, 3 trang.
- PDF là vector: dùng `pdfimages -list` thì chỉ thấy ảnh logo.
- Mở thử bằng Preview của macOS.
- Màn soạn trên headless Chrome, dự án thử của mình, xóa đúng id sau khi xong:
  - bấm Tải PDF ra file đúng tên;
  - nút bị khóa khi có lỗi;
  - có tiến độ khi đang xuất;
  - focus không rơi về `body`.
- Chạy `sheet-verifier` cho cả 2 bộ mẫu. Bìa, DTP 01, DTP 02 phải "OK" hoặc chỉ "lệch nhẹ".
- `code-reviewer` trước commit. Commit 5c khi bạn cho phép.

## Rủi ro
- svg2pdf có thể không vẽ đúng chữ có dấu hoặc chữ đậm/nghiêng → phương án dự phòng là `doc.text` trực tiếp cho text prim. Cách này vẫn dựng từ cùng `Prim[]`, nhưng phải được bạn đồng ý vì lệch nguyên tắc "một nhánh vẽ".
- WebP → đổi sang PNG như mục 3.
- Playwright tải trình duyệt khoảng 150 MB khi cài lần đầu: mình hỏi bạn trước khi tải.
