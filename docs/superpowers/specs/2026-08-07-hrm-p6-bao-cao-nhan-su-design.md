# P6 — Báo cáo nhân sự (bản demo biểu đồ)

Ngày: 2026-08-07

## 1. Mục tiêu

Dựng màn hình **Báo cáo nhân sự** theo khung 16 chỉ số / 4 nhóm mà khách hàng
đưa ra, **đủ đẹp để mang đi show khách ngay**, dữ liệu lấy từ bộ số mẫu trong
FE. Phần nối vào dữ liệu thật là phase sau.

Ràng buộc do người dùng chốt:

- Giữ **nguyên 16 chỉ số, đúng thứ tự 4 nhóm** như ảnh gốc — không cắt bớt.
- Chỉ số nào hệ thống chưa có nguồn dữ liệu thì **báo rõ "Chưa có dữ liệu" và
  ghi cần gì để có**, tuyệt đối không bịa số cho đủ ô.
- Bố cục: **dashboard 1 trang, 4 nhóm cuộn dọc**.

## 2. Đối chiếu 16 chỉ số với dữ liệu hiện có

Khảo sát entity trong `be/libs/entities/src/`:

| # | Chỉ số | Có nguồn? | Nguồn / thiếu gì |
|---|---|---|---|
| 1.1 | Thời gian lấp đầy vị trí (Time to Fill) | ✗ | cần module Tuyển dụng (nhu cầu tuyển, ngày mở vị trí) |
| 1.2 | Chi phí tuyển dụng / nhân sự mới | ✗ | cần module Tuyển dụng (chi phí đăng tin, nền tảng) |
| 1.3 | Tỷ lệ chấp nhận Offer | ✗ | cần module Tuyển dụng (thư mời, phản hồi ứng viên) |
| 1.4 | Tỷ lệ vượt qua thử việc | ✓ | `employees.ngayVaoLam / ngayChinhThuc / loaiHopDong / trangThai` |
| 2.1 | Số lượng nhân sự hiện tại | ✓ | `employees.trangThai = dang_lam_viec` |
| 2.2 | Số lượng nhân sự kỳ trước | ✓ | suy từ `ngayVaoLam` + `resignations.ngayLamViecCuoi` |
| 2.3 | Tỷ lệ nghỉ việc (Turnover) | ✓ | `resignations.loaiThoiViec` — tách tự nguyện / không tự nguyện |
| 2.4 | Tỷ lệ nghỉ việc sớm (Early Turnover) | ✓ | `ngayVaoLam` vs `ngayLamViecCuoi` < 6 tháng |
| 2.5 | Tỷ lệ giữ chân nhân sự cốt cán | ✗ | cần cờ "nhân sự cốt cán" trên `Employee` (chưa có) |
| 3.1 | Tỷ lệ hoàn thiện hồ sơ pháp lý | ✓ | trường bắt buộc của `Employee` + `labor_contracts` |
| 3.2 | Tỷ lệ vắng mặt (Absenteeism) | ✓ | `timesheets.soNgayNghiKhongLuong / soNgayOm / soOTrong` |
| 3.3 | Tần suất vi phạm & quyết định kỷ luật | ✗ | cần module Biên bản vi phạm (chỉ có `resignations.viPham`) |
| 3.4 | Tỷ lệ làm thêm giờ (Overtime) | ✓ | `timesheets.soGioLamThem / soNgayCong` |
| 4.1 | Số giờ đào tạo trung bình / nhân viên | ✗ | cần module Đào tạo |
| 4.2 | Chi phí đào tạo nội bộ / nhân viên | ✗ | cần module Đào tạo |
| 4.3 | Tỷ lệ thăng tiến nội bộ | ✓ | `employment_histories.loaiThayDoi = bo_nhiem \| dieu_chuyen` |

**9 chỉ số có nguồn thật, 7 chỉ số chờ module.** Con số này hiển thị ngay trên
đầu màn hình để khách nhìn phát biết ranh giới giữa "làm được rồi" và "còn phải
xây".

## 3. Phạm vi bản này

**Chỉ FE.** Không thêm entity, không thêm endpoint, không đụng BE. Toàn bộ số
liệu nằm trong `duLieuMau.ts` — một file duy nhất, để phase sau thay bằng lời
gọi API mà không phải sửa lại giao diện.

## 4. Kiến trúc

```
fe/src/pages/bao-cao/nhan-su/
  baoCao.types.ts     — kiểu ChiSo / NhomChiSo / BieuDo. `NguonChiSo` là union
                        { co: true, giaTri } | { co: false, canGi } nên KHÔNG
                        tồn tại trạng thái "chưa có nguồn nhưng vẫn có số".
  duLieuMau.ts        — 4 nhóm × 16 chỉ số + 5 biểu đồ. ĐIỂM THAY THẾ DUY NHẤT
                        khi nối API thật.
  dinhDang.ts         — định dạng giá trị theo đơn vị + tính biến động so kỳ trước.
  mauSac.ts           — tên biến CSS của 3 slot màu chuỗi dữ liệu.
  baoCao.css          — biến màu light/dark (`.dark` do MainLayout gắn).
  components/
    TheChiSo.tsx      — thẻ 1 chỉ số (có số / chưa có nguồn).
    BieuDoNhom.tsx    — 1 biểu đồ recharts + bảng số liệu gập được.
    KhoiNhom.tsx      — 1 nhóm: tiêu đề, mô tả, hàng thẻ, các biểu đồ.
  BaoCaoNhanSuPage.tsx
```

Không dùng CHandler: màn này không có state bất đồng bộ, không gọi API, không
form. Dựng CHandler ở đây là thêm 6 file để bọc một hằng số.

### Định tuyến & quyền

- Route `/bao-cao/nhan-su`, mục sidebar nhóm **BÁO CÁO**.
- Quyền: **dùng lại `/nhan-su/ho-so-nhan-vien:xem`**, không khai module quyền
  mới. Lý do: khai module mới bắt buộc phải chạy `ops/grant-quyen-module-moi.ts`
  lúc deploy, quên là màn hình 403 với mọi người — rủi ro không đáng đánh đổi
  cho một màn chỉ đọc số liệu tổng hợp của chính hồ sơ nhân viên. Cùng tiền lệ
  với `/nhan-su/mau-in-hop-dong` và `/luong/bang-luong-them-gio`.
  Khi màn này nối API thật và có endpoint riêng thì tách quyền `/bao-cao/nhan-su`.

## 5. Bảng màu biểu đồ

Ba slot màu, đã chạy qua bộ validate của skill `dataviz` (`--pairs all`) và
PASS cả 5 check ở cả hai chế độ:

| Slot | Light | Dark |
|---|---|---|
| 1 | `#0a9480` (teal thương hiệu, nâng chroma cho đạt sàn) | `#0fa88f` |
| 2 | `#eb6834` | `#d95926` |
| 3 | `#2a78d6` | `#3987e5` |

Teal gốc của thương hiệu `#1f7769` **trượt sàn chroma** (0.084 < 0.1 — đọc ra
màu xám khi in/CVD) nên phải nâng lên `#0a9480`; giữ nguyên tông teal, chỉ đổi
độ bão hoà. Màu khai bằng biến CSS trong `baoCao.css` với nhánh `.dark`, không
ghi hex thẳng vào JSX — chuyển chế độ là màu tự đổi, không cần JS.

Biểu đồ nào từ 2 chuỗi trở lên đều có legend; mọi biểu đồ đều có nhãn số trực
tiếp trên mark và bảng số liệu gập được, nên danh tính chuỗi không bao giờ chỉ
dựa vào màu.

## 6. Bộ biểu đồ (5 cái, dữ liệu mẫu 6 tháng 02–07/2026)

| Nhóm | Biểu đồ | Loại | Chuỗi |
|---|---|---|---|
| 1 | Tỷ lệ vượt qua thử việc theo tháng | cột | 1 (%) |
| 2 | Tổng nhân sự cuối kỳ | đường | 1 (người) |
| 2 | Vào mới vs Nghỉ việc | cột nhóm | 2 (người) |
| 3 | Tỷ lệ vắng mặt vs Tỷ lệ làm thêm giờ | cột nhóm | 2 (%) |
| 4 | Lượt bổ nhiệm / điều chuyển nội bộ | cột | 1 (lượt) |

Mỗi biểu đồ **một trục** duy nhất; chuỗi trong cùng biểu đồ luôn cùng đơn vị.
Vì thế headcount tách khỏi vào/ra thành hai biểu đồ riêng thay vì ép chung một
khung hai thang đo.

## 7. Cách thẻ chỉ số hiển thị

- **Có số**: giá trị lớn + đơn vị, bên dưới là biến động so kỳ trước với mũi tên
  và màu theo `chieuTot` (tỷ lệ nghỉ việc giảm = tốt = xanh; tỷ lệ vượt thử việc
  giảm = xấu = đỏ), và một dòng ghi nguồn dữ liệu.
- **Chưa có nguồn**: viền đứt, nền xám, giá trị hiển thị dấu `—`, kèm dòng
  "Cần: <module>". Cố ý làm nhạt hơn thẻ có số để mắt khách hàng bám vào phần
  đã chạy được.
- Cả hai loại đều có tooltip là phần "Phân tích & Ý nghĩa Áp dụng" chép nguyên
  từ bảng gốc của khách.

## 8. Kiểm thử

Vitest, chạy bằng `cd fe && npm run test`:

- `dinhDang.test.ts` — định dạng theo từng đơn vị, tiếng Việt (dấu phẩy thập
  phân); biến động khi kỳ trước bằng 0 (không được ra `Infinity`); chiều
  tốt/xấu đảo đúng theo `chieuTot`.
- `duLieuMau.test.ts` — chốt đúng 16 chỉ số / 4 nhóm, đúng 9 chỉ số có số và 7
  chỉ số chưa có nguồn; mọi chỉ số `co: false` phải khai `canGi`; mọi chuỗi
  biểu đồ phải có mặt trong mọi điểm dữ liệu.
- `BaoCaoNhanSuPage.render.test.tsx` — render được, hiện đủ 4 tiêu đề nhóm và
  đúng số thẻ "Chưa có dữ liệu".

## 9. Việc còn lại cho phase sau

1. Module Tuyển dụng → mở khoá 3 chỉ số nhóm 1.
2. Module Đào tạo → mở khoá 2 chỉ số nhóm 4.
3. Cờ "nhân sự cốt cán" trên `Employee` → mở khoá chỉ số 2.5.
4. Module Biên bản vi phạm → mở khoá chỉ số 3.3.
5. Endpoint `GET /bao-cao/nhan-su?ky=YYYY-MM` ở config-service tính 9 chỉ số đã
   có nguồn, thay `duLieuMau.ts`; lúc đó tách quyền `/bao-cao/nhan-su:xem` và
   thêm vào `ops/grant-quyen-module-moi.ts`.
