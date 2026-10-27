# Các điểm cần PO chốt

Cập nhật: 27/10/2026, sau P5c (xuất PDF).

Có **15 điểm** chưa chốt. Điểm nào app cũng đang chạy theo một phương án tạm (ghi ở dòng "App hiện tại"), nên chưa có điểm nào chặn việc làm tiếp. Dù vậy, các điểm ưu tiên **Cao** nên chốt trước P6 (deploy).

Khi PO trả lời: ghi vào cột **Quyết định PO** ở bảng tóm tắt cuối file, đổi trạng thái, rồi cập nhật `docs/super-plan.md` và code liên quan.

---

## A. Nội dung in trên bản vẽ

### A1. Dấu nối "Máy kéo – Tủ điều khiển" trên DTP 02
- **Bối cảnh:** hai bộ mẫu ghi khác nhau.
  - Bộ nhà ở: nhãn "MÁY KÉO - TỦ ĐIỀU KHIỂN", giá trị "FUJI - THAILAND ĐỒNG BỘ" (nối bằng dấu cách).
  - Bộ khách sạn: nhãn "MÁY KÉO/ TỦ ĐIỀU KHIỂN", giá trị "MONTANARI/ STEP".
- **Phương án:**
  - (a) nối bằng dấu cách
  - (b) nối bằng " / "
  - (c) gộp thành một ô nhập tự do
- **Đề xuất:** (b). Lý do: tách rõ hai thiết bị khi tên máy có sẵn dấu gạch ngang.
- **App hiện tại:** (a). Code ở `src/drawing/sheets/spec.ts`.

### A2. Thông tin công ty và logo
- **Bối cảnh:** bìa và khung tên in tên, trụ sở, điện thoại công ty và logo DTP. App đang chép nguyên từ PDF mẫu:
  - Tên: "CÔNG TY TNHH EDUCATION SOLUTIONS VIỆT NAM"
  - Trụ sở: Tầng 1, Tòa Nhà Vietphone Building, Số 64 Nguyễn Đình Chiểu, P. Đa Kao, Quận 1, TP. HCM
  - Điện thoại: (028) 3845 6604
  - Logo: ảnh WebP chuyển từ PNG.
- **Cần PO:**
  - Xác nhận thông tin trên còn đúng.
  - Gửi logo dạng vector (SVG hoặc PDF) nếu có, để in A3 nét hơn.
- **App hiện tại:** dùng như trên. Muốn đổi chỉ cần sửa `src/config/company.ts`.

### A3. Bảng hiệu chỉnh chỉ có 1 dòng
- **Bối cảnh:** khung mẫu chỉ có 1 dòng dữ liệu, trong khi một dự án có thể hiệu chỉnh nhiều lần.
- **Phương án:**
  - (a) in lần mới nhất và cảnh báo ở form
  - (b) nới bảng thành 2–3 dòng (khác khung mẫu)
  - (c) chặn không cho nhập quá 1 lần
- **Đề xuất:** (a).
- **App hiện tại:** (a). Hằng số `REVISION_TABLE_ROWS` nằm trong `src/domain/config.ts`.

### A4. "Hạng mục" trong khung tên
- **Bối cảnh:** khung tên của cả hai mẫu ghi cố định "THANG MÁY". Bìa thì ghi dài, ví dụ "THANG TẢI KHÁCH - TẢI TRỌNG 550 KG - SỐ LƯỢNG : 1 THANG".
- **Phương án:**
  - (a) cố định "THANG MÁY"
  - (b) thêm một ô nhập riêng
- **Đề xuất:** (a).
- **App hiện tại:** (a).

### A5. Mục "II / PHÒNG MÁY" trên DTP 01 với thang không phòng máy (MRL)
- **Bối cảnh:** bộ nhà ở là thang MRL nhưng vẫn in 5 ý về phòng máy. Quyết định đã chốt trước đó là "luôn vẽ buồng trên cùng".
- **Phương án:**
  - (a) luôn in như mẫu
  - (b) với MRL, đổi tiêu đề thành "BUỒNG TRÊN CÙNG"
  - (c) với MRL, bỏ mục này
- **Đề xuất:** (a), cho tới khi có hướng dẫn khác.
- **App hiện tại:** (a).

### A6. Sửa lỗi chính tả có sẵn trên mẫu
- **Bối cảnh:** mẫu viết sai một số chỗ, app đã sửa:

  | Trên mẫu | Trong app |
  |---|---|
  | TRÁCH NHIÊM | TRÁCH NHIỆM |
  | CARBIN | CABIN |
  | Đặt tính | Đặc tính |
  | 2.Cung cấp | 2. Cung cấp |

- **Cần PO:** đồng ý sửa, hay yêu cầu giữ nguyên như mẫu.

### A7. Cách viết số trên bản vẽ
- **Bối cảnh:** "Tổng chiều cao hố" đang in có dấu chấm ngăn nghìn ("20.900 mm"). Các kích thước khác in không có dấu, giống mẫu ("W 1500 (Rộng)"). Mẫu không có ví dụ cho dòng này, vì cả hai đều in "-- mm".
- **Phương án:**
  - (a) "20.900 mm"
  - (b) "20900 mm"
- **Đề xuất:** (b), cho thống nhất với các kích thước khác.
- **App hiện tại:** (a). Code ở `formatMm` trong `src/lib/format.ts`.

### A8. Ghi chú thêm trên DTP 01
- **Bối cảnh:** ô "Ghi chú thêm" được in thành mục "IV / GHI CHÚ" ở cuối trang.
  - Ghi chú dài thì chữ cả trang co nhỏ lại; vừa tối đa khoảng 15 dòng.
  - Dài hơn nữa thì bị cắt, kết thúc bằng "…".
- **Cần PO:** vị trí và giới hạn này có ổn không, hay cần giới hạn số dòng ngay ở form.

### A9. Kích thước bảng trên DTP 02
- **Bối cảnh:** hai bộ mẫu vẽ bảng "ĐẶC TÍNH KỸ THUẬT" khác cỡ. App theo bộ nhà ở, nên với bộ khách sạn bảng hẹp hơn mẫu khoảng 12 mm và lệch trái khoảng 10 mm. Nội dung, số dòng và số liệu đều đúng.
- **Phương án:**
  - (a) một cỡ bảng chung, theo bộ nhà ở
  - (b) theo bộ khách sạn
- **Đề xuất:** (a).
- **App hiện tại:** (a). Số đo ở `SPEC` trong `src/drawing/frame/layout.ts`.

### A10. Kiểu chữ tên bản vẽ trong khung tên
- **Bối cảnh:** khung tên của mẫu DTP 01 in HOA ("HẠNG MỤC TRÁCH NHIỆM"), còn DTP 02 in thường ("Đặt tính kỹ thuật", sai chính tả).
- **Phương án:**
  - (a) in HOA mọi trang
  - (b) giữ kiểu chữ riêng từng trang như mẫu
- **Đề xuất:** (a), cho thống nhất.
- **App hiện tại:** (a).

## B. Kỹ sư cần xác nhận

### B1. Bảng tra PIT / OH tối thiểu theo tốc độ
- **Bối cảnh:** đây là giá trị tạm, dựa phỏng theo TCVN 6395 / TCVN 7628. Bảng chỉ dùng để **cảnh báo**, không chặn xuất PDF. Code ở `PIT_OH_BY_SPEED` trong `src/domain/config.ts`.

  | Tốc độ tới (m/phút) | PIT tối thiểu (mm) | OH tối thiểu (mm) |
  |---|---|---|
  | 45 | 1200 | 3500 |
  | 60 | 1400 | 3600 |
  | 90 | 1500 | 3600 |
  | 105 | 1600 | 4000 |
  | 150 | 1800 | 4200 |

- **Cần kỹ sư:** sửa hoặc xác nhận các giá trị trong bảng.

### B2. Tường chừa mỗi bên lỗ chờ cửa tầng (`minOpeningSide`)
- **Bối cảnh:** app báo **lỗi** (chặn PDF) khi lỗ chờ rộng hơn bề rộng hố − 2 × 100 mm. Con số 100 mm là giá trị tạm.
- **Cần kỹ sư:** xác nhận giá trị đúng.

### B3. Khe tối thiểu giữa cabin và hố
- **Bối cảnh:** app báo **lỗi** khi CW + 400 > AH (khe ray) hoặc CD + 600 > BH (đối trọng + ngưỡng cửa). Hai số này lấy từ cả hai bộ mẫu.
- **Cần kỹ sư:** đây có phải mức tối thiểu chung cho mọi thang không, hay chỉ đúng với hai bộ mẫu.

## C. Nhập liệu và vận hành

### C1. Ô số gõ "1.500"
- **Bối cảnh:** ô số hiện đọc "1.500" là 1,5 (dấu chấm là dấu thập phân). Người Việt hay gõ dấu chấm để ngăn nghìn.
- **Phương án:**
  - (a) ô mm chỉ nhận số nguyên và coi dấu chấm là ngăn nghìn
  - (b) giữ như hiện tại, báo lỗi khi kết quả không phải số nguyên
- **Đề xuất:** (a). Riêng ô tốc độ (có số lẻ) thì dùng dấu phẩy cho phần thập phân.
- **App hiện tại:** (b). Code ở `src/components/ui/number-input.tsx`.

### C2. Tài khoản Cloudflare và 2 email được vào app
- **Bối cảnh:** P6 cần một tài khoản Cloudflare để deploy, và 2 email được Cloudflare Access cho phép đăng nhập.
- **Cần PO:** chọn tài khoản Cloudflare và cho biết 2 email.

---

## Bảng tóm tắt

| Mã | Câu hỏi | Đề xuất | Ưu tiên | Trạng thái | Quyết định PO |
|---|---|---|---|---|---|
| A1 | Dấu nối máy kéo – tủ điều khiển (DTP 02) | " / " | Trung bình | Chờ chốt | |
| A2 | Thông tin công ty và logo vector | Xác nhận + gửi SVG | **Cao** | Chờ chốt | |
| A3 | Bảng hiệu chỉnh 1 dòng | In lần mới nhất + cảnh báo | Trung bình | Chờ chốt | |
| A4 | "Hạng mục" trong khung tên | Cố định "THANG MÁY" | Thấp | Chờ chốt | |
| A5 | Mục "Phòng máy" trên DTP 01 với thang MRL | Luôn in như mẫu | Thấp | Chờ chốt | |
| A6 | Sửa lỗi chính tả của mẫu | Sửa | Thấp | Chờ chốt | |
| A7 | "20.900 mm" hay "20900 mm" | "20900 mm" | Thấp | Chờ chốt | |
| A8 | Giới hạn ghi chú thêm trên DTP 01 | Giữ (co chữ, tối đa ~15 dòng) | Thấp | Chờ chốt | |
| A9 | Cỡ bảng DTP 02 (2 mẫu khác nhau) | Một cỡ, theo bộ nhà ở | Thấp | Chờ chốt | |
| A10 | Tên bản vẽ trong khung tên in HOA | In HOA mọi trang | Thấp | Chờ chốt | |
| B1 | Bảng PIT/OH tối thiểu | Kỹ sư điền | **Cao** | Chờ kỹ sư | |
| B2 | Tường chừa mỗi bên lỗ chờ (100 mm) | Kỹ sư xác nhận | **Cao** | Chờ kỹ sư | |
| B3 | Khe tối thiểu 400 / 600 mm | Kỹ sư xác nhận | Trung bình | Chờ kỹ sư | |
| C1 | Ô số gõ "1.500" | Hiểu là 1500 | Trung bình | Chờ chốt | |
| C2 | Tài khoản Cloudflare + 2 email | PO cung cấp | **Cao** (trước P6) | Chờ chốt | |
