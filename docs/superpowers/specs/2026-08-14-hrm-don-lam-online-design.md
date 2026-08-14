# Design: Đơn làm việc online & ngày công online

**Ngày:** 2026-08-14
**Trạng thái:** Chủ sản phẩm đã chốt 4 điểm nghiệp vụ (§2); phần còn lại mình tự quyết.
**Phạm vi:** Backend (`don-cham-cong`, `ban-ghi-cham-cong`, `bang-cong`) + Frontend (màn đơn từ
nhân viên/HR, màn chấm công, bảng công). **Không** đụng `bang-luong`.
**Phụ thuộc:** P3.6 (đơn từ), P3.9 (bảng công tự sinh), P4 (bảng lương — chỉ đọc, không sửa).

---

## 1. Vấn đề

Hệ thống chưa có khái niệm **làm việc online** (ở nhà). Hai hệ quả:

1. **Không chấm công được.** `ban-ghi-cham-cong.service.ts` **chặn** (403 `MA_LOI_NGOAI_BAN_KINH`)
   mọi lượt bấm ngoài bán kính địa điểm. Lối thoát duy nhất hiện nay là
   `Employee.choPhepChamNgoaiVung` — một cờ **mở vĩnh viễn cho một người**, HR bật tay, không có
   đơn, không có người duyệt, không có ngày hết hạn.
2. **Bảng công không phân biệt được.** Bộ ký hiệu (`X, 1/2, P, L, NB, CT, O, KL, N`) không có ô
   nào nói "hôm đó người này làm ở nhà". Tiền ăn ca vì thế vẫn trả cho ngày làm online.

## 2. Bốn điểm chủ sản phẩm đã chốt

1. **Cơ chế = đơn.** Nhân viên nộp đơn xin làm online, quản lý duyệt — đi đúng luồng đơn từ đã có,
   không phải một cờ cấu hình.
2. **Vẫn phải chấm công như bình thường.** Đơn đã duyệt **không** tự phát ra ngày công; người ta
   vẫn phải bấm vào/ra.
3. **Bỏ kiểm vị trí** trong ngày có đơn đã duyệt. Không chặn, và cũng không gắn cờ "ngoài vùng"
   (xem §4.2 vì sao cờ đó phải tắt chứ không chỉ "không chặn").
4. **Ngày công online không có tiền ăn trưa.** Nửa buổi online cũng **không** — "làm nửa buổi thì
   không tính tiền ăn".

## 3. Ký hiệu `OL` — trục xoay của cả thiết kế

```ts
{ kyHieu: 'OL', nhan: 'Làm online', soCong: 1, nhom: 'lam_viec' }
```

Một dòng này giải quyết luôn toàn bộ phần tiền, **không sửa `bang-luong` một dòng nào**:

| Khoản | Đọc gì | Ngày `OL` ra sao |
|---|---|---|
| Tiền ăn ca | `demNgayLamDu()` — chỉ đếm ô `X` (`bang-luong.service.ts:189`) | **Không** được suất ăn ✅ (§2.4) |
| Lương chính | `soNgayCong` = Σ `soCongCuaKyHieu()` (`bang-cong.service.ts:104`) | 1 công, **đủ lương** ✅ |
| Phép năm theo công thực tế | `soNgayCong + soNgayOm` (`quy-phep.service.ts:427`) | Vẫn tích phép ✅ |

`demNgayLamDu()` đã cố ý loại `CT`/`NB` từ trước — `OL` chỉ đơn giản là thành viên thứ ba của
nhóm "có công nhưng không ăn cơm công ty". Không có ngoại lệ mới nào phải nhớ.

**Vì sao không đẻ ký hiệu riêng cho nửa buổi online.** Nửa buổi online = 1 công, không ăn ca —
**giống hệt** online trọn ngày về mặt tiền. Thêm `OL½` chỉ để hiển thị là thêm một dòng vào bảng
ký hiệu mà mọi nơi tính tiền phải học thuộc, đổi lại không một đồng nào khác đi. Buổi nằm ở
`AttendanceRequest.buoi`, và ô bảng công hiện chú thích (tooltip) đọc từ đó.

> Lưu ý ranh giới: `1/2` (0,5 công) là **nghỉ** nửa ngày. Nửa buổi online là **làm** cả ngày, chỉ
> khác chỗ ngồi ⇒ vẫn 1 công. Hai thứ khác nhau, không dùng lẫn.

## 4. Backend

### 4.1 Đơn — loại thứ 5, không thêm cột nào

`loaiDon = 'lam_online'`, dùng lại nguyên các cột sẵn có của `attendance_requests`:

| Cột | Dùng cho đơn online |
|---|---|
| `ngay` / `denNgay` | Khoảng ngày làm online |
| `buoi` (`ca_ngay\|sang\|chieu`) | Chỉ có nghĩa khi `ngay === denNgay` — đúng luật đã áp cho đơn nghỉ |
| `lyDo` | Lý do |

Sửa: `@IsIn` của `loaiDon` ở `create-don-cham-cong.dto.ts` **và** `tao-don-cua-toi.dto.ts` (hai
DTO, hai đường nộp — HR nộp hộ và nhân viên tự nộp).

**Không** snapshot số liệu gì lúc tạo đơn (khác `nghi_phep`/`lam_them_gio`): đơn online không trừ
quỹ, không sinh tiền. `tinhCacTruongSnapshot()` bỏ qua loại này.

### 4.2 Chấm công — mở khoá đúng ngày, không hơn

Chỗ chặn hiện tại (`ban-ghi-cham-cong.service.ts:243`):

```ts
if (kq.ngoaiVung && emp.choPhepChamNgoaiVung !== true) → 403
```

thành

```ts
if (kq.ngoaiVung && emp.choPhepChamNgoaiVung !== true && !laOnline) → 403
```

`laOnline` = tồn tại đơn `lam_online`, `trangThai='da_duyet'`, `isActive`, phủ `ngay` đang chấm
(`ngay >= don.ngay && ngay <= (don.denNgay ?? don.ngay)`).

Bản ghi ngày online lưu:

- `laOnline: true` — **cột mới** trên `attendance_records`.
- `ngoaiVung: false`, `locationId`/`locationTen` **để trống** — ngày đó không có vùng nào để mà
  nằm ngoài. Giữ `ngoaiVung: true` thì `suy-ky-hieu` sẽ đẻ cảnh báo `NGOAI_VUNG` cho **mọi** ngày
  online của **mọi** người, và một cảnh báo luôn bật là một cảnh báo không ai đọc — đúng thứ mà
  quyết định "chặn thay vì gắn cờ" ở P3.5 sinh ra để diệt.
- **Vẫn lưu** `latitude`/`longitude`/`doChinhXacMet`/`ipAddress`/`deviceId` như thường: bỏ *kiểm*
  vị trí không có nghĩa là bỏ *ghi* vị trí. Cần đối chiếu về sau thì dữ liệu vẫn còn.

Giờ giấc **không nới**: `soPhutDiMuon`/`soPhutVeSom`, luật ca, luật lượt vào còn hiệu lực, cảnh
báo thiếu giờ ra — giữ nguyên như ngày ở văn phòng.

`laOnline` bám theo `ngay` của bản ghi, mà lượt ra thừa hưởng `ngay` của lượt vào đang mở (ca qua
đêm) ⇒ ca đêm bắt đầu trong ngày online thì lượt ra sáng hôm sau vẫn được mở khoá. Không phải xử
lý riêng.

### 4.3 Bảng công — chèn đúng một bậc vào thang ưu tiên

`SuyKyHieuInput` thêm `coDonOnline: boolean`. Thang ưu tiên hiện tại chỉ chèn thêm **một** dòng,
giữa "đơn nghỉ đã duyệt" (dòng 4) và "có chấm vào = X" (dòng 5):

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Ngoài khoảng làm việc | không đổi |
| 2 | Ngoài lịch tuần | không đổi |
| 3 | Ngày lễ | `L` — không đổi |
| 4 | Đơn nghỉ đã duyệt | ký hiệu của đơn nghỉ — **thắng đơn online** |
| **4.5** | **Đơn online + có chấm vào** | **`OL`** (thiếu chấm ra → vẫn cảnh báo `thieu_gio_ra`) |
| 5 | Có chấm vào | `X` — không đổi |
| 6 | Không đủ căn cứ | trống + `chua_xu_ly` |

**Đơn online mà không chấm công rơi xuống dòng 6** — ô trống, `chua_xu_ly`. Đây chính là §2.2 được
cài vào luật: đơn online không tự phát công, HR phải nhìn thấy.

**Đơn nghỉ thắng đơn online** (dòng 4 chạy trước): người vừa xin nghỉ vừa xin làm online cùng ngày
thì cái nghỉ là cái đáng tin hơn về mặt tiền. Cảnh báo `DON_VA_CHAM_CONG` hiện có vẫn nổ nếu ngày
đó có chấm công. Không thêm mã cảnh báo mới, không chặn lúc tạo đơn: hệ thống hiện **không** có
luật chống trùng đơn cho bất kỳ loại nào, dựng riêng cho `lam_online` là một luật lệch chuẩn.

`bang-cong.service.ts` đang nạp đơn nghỉ rồi `gomTheoNgay()` trải ra từng ngày — đơn online đi
đúng đường đó, chỉ khác chỗ đổ vào `coDonOnline` thay vì `donNghi`.

### 4.4 Tổng hợp tháng

`Timesheet` thêm `soNgayCongOnline` (đếm ô `OL`), tính cùng chỗ với `soNgayNghiPhep`/`soNgayOm`
(`bang-cong.service.ts:104-110`).

## 5. Frontend

| Màn | Việc |
|---|---|
| `services/attendanceRequestService.ts` | `AttendanceRequestType` thêm `'lam_online'` |
| `cham-cong/don-cham-cong/constants.ts` | `LOAI_DON_OPTIONS` thêm `{ lam_online, "Làm online" }` |
| `truongTheoLoaiDon.ts` | `lam_online: ["ngay","denNgay","buoi","lyDo"]`; `hienBuoi()` nhận thêm loại này |
| `toi/don-tu/loaiDonUI.tsx` | Ô thứ 5: `LaptopOutlined`, gradient teal (`#5ac8fa → #32ade6` — teal của bảng màu iOS, 4 màu kia đã lấy blue/orange/green/purple) |
| `toi/don-tu/moTaDon.ts` | Câu mô tả cho đơn online |
| `cham-cong/cua-toi/ChamCongCuaToiPage` | Hôm nay có đơn online đã duyệt → băng "Hôm nay bạn làm online, cứ bấm ở bất kỳ đâu" |
| Bảng công HR + `toi/bang-cong` | Ô `OL` màu riêng + chú giải; cột tổng "Công online" |

Form HR nộp hộ (`donChamCongForm.convert.ts`) tự đúng nhờ đọc chung `TRUONG_THEO_LOAI`.

## 6. Kiểm thử

| Tầng | Ca phải phủ |
|---|---|
| `suy-ky-hieu.spec` | online + chấm vào → `OL`; online + không chấm → trống/`chua_xu_ly`; online + thiếu chấm ra → `OL` + `thieu_gio_ra`; online đụng đơn nghỉ → đơn nghỉ thắng; online vào ngày lễ → `L`; online ngoài lịch tuần → không đổi |
| DTO (2 file) | `lam_online` hợp lệ ở cả hai đường nộp; loại lạ vẫn 400 |
| `ban-ghi-cham-cong.service.spec` | ngoài vùng + có đơn online duyệt → cho qua, `laOnline=true`, `ngoaiVung=false`, `locationId` rỗng; ngoài vùng + đơn **chờ duyệt** → vẫn 403; ngoài vùng + không đơn → vẫn 403; đơn online không nới giờ (đi muộn vẫn tính) |
| `bang-cong.service.spec` | `soNgayCongOnline` đếm đúng; `soNgayCong` cộng `OL` = 1 |
| `bang-luong.service.spec` | Tháng có `OL` → ăn ca **không** đếm ngày đó; `congThuong` vẫn đủ |
| FE | `truongTheoLoaiDon` bảng trường cho `lam_online`; form nộp đơn gửi đúng payload (`forbidNonWhitelisted`) |

## 7. Rủi ro đã cân nhắc

- **Cột mới `laOnline` / `soNgayCongOnline`**: đều `default: false/0`, dữ liệu cũ đọc ra đúng nghĩa
  ("không phải online", "0 ngày online"). Không cần migration.
- **`forbidNonWhitelisted`**: thêm loại đơn không thêm trường ⇒ không đụng lớp lỗi 400-cả-form đã
  gặp trước đây. Nhưng vẫn phải sửa **cả hai** DTO, quên một cái là một đường nộp bị 400.
- **Không phát sinh quyền mới**: nằm trong module đơn từ đã grant ⇒ **không** phải chạy lại
  `ops/grant-quyen-module-moi.ts` khi deploy.
- **Bảng công đã chốt** không bị ảnh hưởng: ô do HR sửa mang `nguon='hr_sua'`, máy không đụng.
