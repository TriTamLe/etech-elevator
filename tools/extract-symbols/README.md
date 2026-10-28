# extract-symbols

Lấy ký hiệu (cabin, cửa, ray, móc, ...) từ DWG mẫu trong `.external/` ra dữ liệu TypeScript `src/drawing/symbols/data/<id>.ts` (kiểu `SymbolData`, đơn vị mm, gốc tại điểm chèn, y hướng xuống). Không đưa DWG/DXF vào git.

## Chạy

```sh
brew install libredwg                       # một lần, cần lệnh dwg2dxf
python3 -m venv tools/extract-symbols/.venv  # một lần
tools/extract-symbols/.venv/bin/pip install -r tools/extract-symbols/requirements.txt
yarn gen:symbols                             # sinh lại toàn bộ
yarn gen:symbols door-front call-box         # chỉ sinh vài ký hiệu (không ghi lại data/index.ts)
```

Script đổi DWG sang `.out/ref.dxf` (chỉ khi DWG mới hơn), rồi ghi `data/*.ts`, `data/index.ts` và ảnh xem thử `.out/<id>.svg|png` (có dấu + đỏ tại điểm chèn, lưới 1 ô theo mm). Thư mục `.out/` và `.venv/` không commit. Chạy xong nhớ `yarn typecheck`.

## Cấu hình: `symbols.config.json`

Mỗi ký hiệu một mục (thứ tự trong file = thứ tự trong `SYMBOL_DATA`):

| Khóa | Ý nghĩa |
|---|---|
| `id` | tên file và khóa trong `SYMBOL_DATA` (kebab-case) |
| `label` | tên tiếng Việt cho trang xem thử |
| `block` | tên block nguồn trong DWG; block lồng nhau được bung hết |
| `region` | (tùy chọn) hộp `[x0, y0, x1, y1]` theo tọa độ DXF của block (mm, y hướng lên); chỉ giữ nét nằm **trọn** trong hộp |
| `exclude` | (tùy chọn) danh sách hộp; nét nằm trọn trong hộp bị bỏ |
| `origin` | điểm chèn: `{"anchor": "c"}` (hoặc `bc`, `tc`, `lc`, `rc`, `bl`, `br`, `tl`, `tr`) theo bbox sau khi lọc, hoặc `{"xy": [x, y]}` theo tọa độ DXF (`null` ở một trục = lấy tâm bbox trục đó) |
| `stretch` | `[{"axis": "x" or "y", "at": số, "dir": 1 or -1}]`; tọa độ **sau khi dời gốc và lật y** (y hướng xuống). Nét ở phía `dir` của `at` được dịch theo `dir` khi kéo giãn |

Bỏ qua khi bung: chữ, kích thước, leader, hatch, solid, region 3D, OLE. Ellipse/spline nắn thành polyline (sai lệch tối đa 0,25 mm).

## Thêm hoặc sửa một ký hiệu

1. Ký hiệu có sẵn block: thêm mục với `block`, `origin`, `stretch`. Chạy `yarn gen:symbols <id>` và xem `.out/<id>.png`.
2. Ký hiệu là nét rời trong block của trang: tìm tọa độ vùng (vẽ block ra ảnh có lưới, hoặc dò `ezdxf`), đặt `region` ôm sát vật; tăng/giảm vài mm quanh nét cần giữ vì phép lọc yêu cầu nét nằm trọn trong hộp.
3. DWG cập nhật: chỉ cần chạy lại `yarn gen:symbols`; nếu tọa độ trang đổi (vật bị dời) thì chỉnh lại `region`/`origin.xy`.

## Dọn nét thừa

Nét của vật khác lọt vào vùng cắt (đường tim dài, tường, mũi tên, đường dẫn chú thích, ...): thêm một hộp vào `exclude` bao trọn nét đó (và không bao trọn nét cần giữ). Nét dài vượt khỏi `region` đã tự bị loại, nên không cần `exclude`. Sau khi sửa, chạy lại và xem ảnh `.out`. Không sửa tay file trong `data/`: chạy lại script sẽ ghi đè.

## Kéo giãn (stretch)

Giống lệnh STRETCH của AutoCAD: mọi điểm nằm ở phía `dir` của `at` (tức `(tọa độ − at) × dir > 0`) dịch theo `dir` đúng lượng kéo.
- `dir: 1` dịch phần phía tọa độ lớn: cửa rộng thêm về bên phải.
- `dir: -1` dịch phần phía tọa độ nhỏ. Ký hiệu đứng trên điểm chèn mà y hướng xuống thì dùng `dir: -1` để cao thêm về phía trên.

Cung và đường tròn dịch nguyên khối, không đổi bán kính. Đường tròn đi theo tâm; cung đi theo điểm giữa của chính nét cung, vì tâm có thể nằm phía bên kia đường cắt. `extract.py` báo lỗi và thoát mã khác 0 nếu một cung hay đường tròn vắt qua đường kéo giãn; khi đó dời `at` sang chỗ khác. Đặt `at` ở giữa vật, không trùng nét quan trọng. Với cửa hai cánh, `at: 0` nằm tại tim cửa nên cánh phải nhận toàn bộ lượng giãn; nếu cần hai cánh giãn đều, nơi dùng phải tự chia.
