# P4 (A+B) — Bảng lương: nền cấu hình + máy tính 2 bảng (khai báo & thực tế)

**Ngày:** 2026-07-24
**Nhánh:** feat/hrm-p3.1-cham-cong-thuc-te (nhánh tích hợp)
**Nguồn:** phân tích file `LƯƠNG & THƯỞNG xây phần mềm.xlsx` (sheet "Bảng lương khai báo",
"Bảng lương thực tế", "Tính thuế TNCN", "PHIẾU LƯƠNG", "Thông tin").
**Trạng thái:** Design chờ user review

## 1. Mục tiêu & phạm vi

Admin chạy **một kỳ lương/tháng**, phần mềm tự lấy công từ Bảng công + tham số ở Hồ sơ NV,
rồi **sinh RA hai bảng lương từ cùng dữ liệu**:

- **Bảng khai báo** — dùng **mức lương khai báo** (mặc định 5.500.000₫). Con số nộp thuế/BHXH.
- **Bảng thực tế** — dùng **lương thỏa thuận** (lương thật). Con số NV thực nhận.

**Phase này (A+B) làm:**
- **A. Nền cấu hình:** mở rộng Hồ sơ NV các trường lương + màn Cấu hình lương chung (mọi hằng
  số thuế/BHXH/giảm trừ/biểu thuế đều **sửa được**).
- **B. Máy tính lương 1 kỳ:** engine tính thuần (có test) + màn admin xem/sửa/chốt 2 bảng.

**KHÔNG làm ở phase này (để C/D sau):** phiếu lương in/PDF, xuất Excel, NV tự xem phiếu ở `/toi`,
quyết toán TNCN năm, tờ khai thuế, báo cáo BHXH.

## 2. Máy tính lương (engine) — **hoàn toàn config động**

> **Yêu cầu cốt lõi (user):** KHÔNG hardcode gì cả. Khoản nào **chịu/không chịu thuế**, **mức
> trần miễn thuế**, **cách tính (công thức)**, **% thuế / bậc thuế**, tỷ lệ BHXH, giảm trừ — TẤT
> CẢ đọc từ `CauHinhLuong` và sửa được trên giao diện, vì chính sách sẽ thay đổi.

Engine là **hàm thuần** `tinhDongLuong(dauVao, cauHinh) → KetQuaLuong` — **không có hằng số
nghiệp vụ nào trong code**, chỉ có logic diễn giải cấu hình. Chạy **giống hệt cho cả hai mức**
(khai báo/thực tế), chỉ khác `luongGoc`.

### 2.1 Mô hình cấu hình = danh sách **Khoản lương** + **Quy tắc thuế** (tất cả trong `CauHinhLuong`)

**"Công thức config"** không phải ô nhập công thức tự do (rủi ro, khó test) mà là mỗi khoản
lương chọn **một loại công thức có sẵn + tham số**. Bộ loại này phủ hết các khoản trong file và
mọi thay đổi chính sách thực tế:

Mỗi `KhoanLuong` gồm:
- `ma`, `ten` (vd `LUONG_CONG`, "Lương theo công"; `AN_CA`, "Ăn ca"; `HIEU_SUAT`…).
- `loaiCongThuc` (enum): một trong
  - `LUONG_THEO_CONG` — `base/congChuan × (congThuong + congKhac) + base/congChuan × congThuViec × thuViecRate`.
  - `DINH_MUC_x_CONG` — `dinhMuc × congThuong` (vd ăn ca 50k×công). tham số: `dinhMuc`.
  - `CO_DINH_THANG` — số cố định/tháng, chia theo công: `soTien/congChuan × (congThuong + congThuViec×thuViecRate)`. tham số: nguồn (`soTien` cố định, hoặc lấy từ trường Hồ sơ NV).
  - `PHAN_TRAM_BASE` — `tyLe × base`. tham số: `tyLe`.
  - `NHAP_THEO_KY` — số nhập/import theo kỳ (hiệu suất, thưởng).
- `chiuThue` (bool) — khoản này **có tính vào thu nhập chịu thuế** không.
- `tranMienThue` (number|null) — nếu có: phần **≤ trần** được miễn, phần **vượt** mới chịu thuế
  (vd ăn ca trần 1.200.000). null = không có trần (chịu/không theo `chiuThue` toàn phần).
- `vaoTongThuNhap` (bool, mặc định true) — có cộng vào Tổng thu nhập không.
- `vaoBHXH` (bool) — có nằm trong căn cứ đóng BHXH không (để dành, phase này BHXH theo mức khai báo).
- `thuTu` — thứ tự hiển thị/tính.

**Quy tắc khấu trừ & thuế** (trong `CauHinhLuong`, sửa được):
- `giamTruBanThan`, `giamTruNPT` (số tiền).
- `bhxh`: `{ tyLe, canCu: 'MUC_KHAI_BAO' | 'LUONG_THOA_THUAN' }` (mặc định tyLe 0.105, canCu MUC_KHAI_BAO — quyết định user).
- `bacThue`: danh sách `[{den:number|null, suat:number}]` (lũy tiến từng phần) — **sửa được cả
  mốc lẫn %**.
- `thuViec`: `{ tyLe }` (0.85), `congChuan` (24).
- `quyTacThoiVu`: `{ tyLe, nguong }` (0.10, 2.000.000).
- `quyTacCamKet`: `{ mienThue: true }`.
- `lamTron`: `1000` (làm tròn tới nghìn — file `ROUND(…,-3)`).

Giá trị mặc định khi **seed lần đầu** = đúng theo file (§ bảng dưới), nhưng chỉ là dữ liệu khởi
tạo — admin sửa thoải mái, code KHÔNG phụ thuộc con số nào.

### 2.2 Thuật toán (diễn giải cấu hình, không hằng số)

```
// 1) Tính từng khoản theo loaiCongThuc + tham số
for khoan in cauHinh.khoanLuong (theo thuTu):
    giaTri[khoan] = tinhKhoan(khoan, dauVao, cauHinh)   // round theo cauHinh.lamTron

// 2) Tổng thu nhập = Σ khoản có vaoTongThuNhap
tongThuNhap = Σ giaTri[k] where k.vaoTongThuNhap

// 3) Phần thu nhập KHÔNG chịu thuế (từ chính cấu hình từng khoản)
thuNhapMienThue = Σ over k:
    if !k.chiuThue:            giaTri[k]                       // cả khoản miễn
    elif k.tranMienThue!=null: min(giaTri[k], k.tranMienThue) // phần ≤ trần được miễn
    else:                      0
bhxh = round( cauHinh.bhxh.tyLe × baseBHXH )   // baseBHXH theo cauHinh.bhxh.canCu
                                               //  (MUC_KHAI_BAO → mucKhaiBao cho cả 2 bảng)

// 4) Thuế — theo quy tắc cấu hình, chọn nhánh theo cờ NV
if camKet && cauHinh.quyTacCamKet.mienThue:  thue = 0
elif thoiVu:
    tnCT = max(0, tongThuNhap - thuNhapMienThue)
    thue = tnCT >= quyTacThoiVu.nguong ? round(quyTacThoiVu.tyLe × tnCT) : 0
else:
    giamTru = giamTruBanThan + soNPT × giamTruNPT
    tntt = max(0, tongThuNhap - thuNhapMienThue - bhxh - giamTru)
    thue = thueLuyTien(tntt, cauHinh.bacThue)   // lũy tiến từng phần theo bậc CẤU HÌNH

// 5) Thực lĩnh
thucLinh = tongThuNhap - bhxh - thue - tamUng - khauTruKhac
```

`thueLuyTien(tntt, bac)`: duyệt `bac` (đã sắp theo `den` tăng dần, phần cuối `den=null` = ∞),
cộng dồn `(min(tntt,den)-mocTruoc) × suat` cho tới khi hết — **hoàn toàn theo dữ liệu bậc**, không
số cứng.

### 2.3 Kết quả một dòng
`{ giaTriTungKhoan: {ma→số}, tongThuNhap, thuNhapMienThue, bhxh, giamTru, thuNhapTinhThue, thue,
thucLinh }` — trả cho **cả khai báo lẫn thực tế** (chạy engine 2 lần, cùng `cauHinh`, khác `base`).

### 2.4 Mặc định seed (theo file 2026 — chỉ là dữ liệu khởi tạo, sửa được)
Khoản: Lương theo công (chịu thuế), Ăn ca (`DINH_MUC_x_CONG` 50.000, chịu thuế, trần 1.200.000),
Phụ cấp cố định (`CO_DINH_THANG` từ hồ sơ, chịu thuế), Hiệu suất (`NHAP_THEO_KY`, chịu thuế),
Thưởng (`NHAP_THEO_KY`, chịu thuế). Giảm trừ 15.500.000 / 6.200.000. BHXH 10,5% theo mức khai báo.
Bậc thuế 5 bậc: `[{den:10e6,suat:.05},{den:30e6,suat:.10},{den:60e6,suat:.20},{den:100e6,suat:.30},
{den:null,suat:.35}]`. Thử việc 85%, công chuẩn 24, thời vụ 10%/ngưỡng 2tr, cam kết miễn thuế.

## 3. Dữ liệu (A)

### 3.1 `CauHinhLuong` (một bản/tenant, **toàn bộ sửa được** — §2.1)
Gồm: `mucKhaiBaoMacDinh`, `congChuan`, `khoanLuong[]` (danh sách khoản + `loaiCongThuc`/tham số/
`chiuThue`/`tranMienThue`/…), `giamTruBanThan`, `giamTruNPT`, `bhxh{tyLe,canCu}`, `bacThue[]`,
`thuViec{tyLe}`, `quyTacThoiVu{tyLe,nguong}`, `quyTacCamKet{mienThue}`, `lamTron`. Không hằng số
nghiệp vụ nào nằm trong code — chỉ có bộ **mặc định seed** (§2.4) để khởi tạo lần đầu.

### 3.2 Hồ sơ NV — thêm nhóm "Lương"
`luongThoaThuan` (số), `mucKhaiBao` (số, mặc định = `mucKhaiBaoMacDinh`), `phuCapCoDinh` (số/tháng,
gộp xăng+ĐT+chuyên cần… — phase này gộp một số cho gọn; tách chi tiết để sau), `soNguoiPhuThuoc`
(số), cờ `dongBH`, `thoiVu`, `camKet`. (Cờ `thuViec` đã có ở trạng thái hồ sơ / suy từ hợp đồng —
xác nhận khi làm plan; nếu chưa có thì thêm.)

### 3.3 `KyLuong` + `DongLuong`
- `KyLuong`: `thang` ('YYYY-MM'), `trangThai` ('nhap'|'chot'), `ngayTongHop`.
- `DongLuong` (một NV/kỳ): khoá `{thang, employeeId}`; lưu **snapshot đầu vào** (công, hiệu suất,
  thưởng, tạm ứng, phụ cấp, cờ, số NPT) + **kết quả cả hai mức** (`khaiBao`, `thucTe` theo §2.4).
  Lưu snapshot để chốt kỳ xong sửa cấu hình không làm đổi số đã chốt.

## 4. Nối với Bảng công (nguồn công)

Khi "Tổng hợp kỳ", backend đọc công của tháng từ dữ liệu chấm công/bảng công đã có
(`bang-cong`/`ban-ghi-cham-cong`): `congThuong` (số công đủ), `congThuViec` (ngày thử việc —
suy từ trạng thái NV trong kỳ), `congKhac` (nghỉ hưởng lương P/L nếu tính công). Chi tiết ánh xạ
"ký hiệu công → loại công cho lương" chốt ở plan (tái dùng logic `thangCong.ts`/bang-cong service).
Nếu một NV chưa có dữ liệu công → công = 0, đánh dấu để admin biết.

## 5. Khoản biến động theo kỳ

Màn chạy kỳ cho admin nhập/sửa theo NV: `hieuSuat`, `thuong`, `tamUng`, `khauTruKhac`. (Import
Excel để phase C — phase này nhập tay trên lưới.) Các số này vào snapshot `DongLuong`.

## 6. Backend (config-service, module `bang-luong`)

- `CauHinhLuong`: `GET /cau-hinh-luong`, `PUT /cau-hinh-luong` (PermissionGuard
  `/luong/cau-hinh:xem|sua`).
- `KyLuong`/`DongLuong`:
  - `POST /bang-luong/tong-hop` `{thang}` → tạo/cập nhật kỳ, lấy công + hồ sơ, chạy engine, lưu
    các `DongLuong`. (`/luong/bang-luong:them`)
  - `GET /bang-luong?thang=` → danh sách dòng của kỳ (cả 2 mức). (`:xem`)
  - `PATCH /bang-luong/:id` → sửa khoản biến động một dòng rồi tính lại dòng đó. (`:sua`)
  - `POST /bang-luong/chot` `{thang}` / `POST /bang-luong/mo-lai` — chốt/mở kỳ. (`:sua`)
- Guard theo khuôn đã siết: `JwtGuard` + `PermissionGuard` + `@Permissions(...)` (KHÔNG AdminGuard,
  KHÔNG @Roles — theo [[authz-adminguard-vs-permissionguard]]). Khi deploy phải chạy
  `ops/grant-quyen-module-moi.ts` cho module `luong` ([[deploy-grant-quyen-module-moi]]).
- Engine ở `libs`/service dưới dạng **hàm thuần** để test không cần DB.

## 7. Frontend (admin)

- Route mới dưới `/nhan-su` (hoặc nhóm `/luong`): **"Bảng lương"** + **"Cấu hình lương"**.
- Màn Cấu hình lương (**config động**): sửa danh sách **Khoản lương** (thêm/xoá/đổi khoản, chọn
  `loaiCongThuc` + tham số, bật/tắt **Chịu thuế**, đặt **mức trần miễn thuế**), sửa **bảng bậc
  thuế** (thêm/bớt bậc, đổi mốc + %), giảm trừ, tỷ lệ + căn cứ BHXH, thử việc %, thời vụ %/ngưỡng,
  công chuẩn, làm tròn. Thay đổi cấu hình chỉ ảnh hưởng kỳ **chưa chốt** (kỳ đã chốt giữ snapshot).
- Màn Bảng lương: chọn tháng → nút **"Tổng hợp"** → lưới có **2 tab: Khai báo / Thực tế**; mỗi
  dòng hiện các cột theo §2.4; sửa được khoản biến động (§5); nút **Chốt kỳ**. Cảnh báo NV thiếu
  công/thiếu cấu hình lương.
- Hồ sơ NV: thêm tab/nhóm "Lương" (§3.2).
- Dùng pattern CHandler hiện có (xem `fe/HANDLER_GUIDE.md`).

## 8. Kiểm thử (bắt buộc cho engine)

`tinhDongLuong` + `thueLuyTien` phủ bảng, với **cấu hình truyền vào** (không đọc hằng số):
- Mỗi bậc thuế + đúng biên (10tr/30tr/60tr/100tr) với bậc mặc định; **và một bộ bậc KHÁC** để
  chứng minh engine chạy theo cấu hình chứ không số cứng.
- `chiuThue` bật/tắt trên một khoản (vd ăn ca) → đổi thu nhập miễn thuế; `tranMienThue` vượt/không
  vượt trần.
- Thêm/bớt một `KhoanLuong` → tổng thu nhập đổi tương ứng.
- Thử việc theo `tyLe` cấu hình, `dongBH` bật/tắt (BHXH theo căn cứ cấu hình = mức khai báo),
  `camKet`→thuế 0, `thoiVu`→10% và dưới ngưỡng→0, NPT 0/1/2, làm tròn theo `lamTron`.
- Đối chiếu vài dòng số của file với bộ cấu hình mặc định (vd Hạnh) làm ca kiểm chứng.

## 9. Rủi ro & ghi chú

- **Hai bảng cùng snapshot, khác `luongGoc`** — engine chạy 2 lần, KHÔNG nhân đôi logic.
- **BHXH cùng số ở 2 bảng** (theo mức khai báo) — cố ý (quyết định user); ghi chú rõ trong code.
- **OT/làm thêm giờ** chưa có nguồn dữ liệu ở phase này → `luongOT=0`, khoản OT-đêm miễn thuế=0;
  bổ sung khi có module OT.
- **Ánh xạ công → loại công cho lương** (P/L có tính công không) chốt ở plan cùng người vận hành.
- Đây là phần mềm kế toán tiền lương ghi nhận số công ty khai — engine tính đúng theo cấu hình;
  giá trị "khai báo" là một trường dữ liệu do công ty nhập, không phải phần mềm tự bịa.
