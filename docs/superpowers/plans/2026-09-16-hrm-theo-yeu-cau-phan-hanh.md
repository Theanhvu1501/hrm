# Kế hoạch: sửa HRM theo sheet "Phần Hành Phần mềm"

Nguồn yêu cầu: `docs/Phần mềm Nhân sự.xlsx`, sheet **Phần Hành Phần mềm** (dòng 4–48).
Mẫu in hợp đồng: `docs/Mau_hop_dong/` (6 file, người dùng tự tải về).
Quyết định phạm vi: làm hết mục "Cần sửa" + "Bổ sung ngay"; bỏ mục "Bổ sung sau"
(phân hệ IV Đào tạo, V Tuyển dụng) và mục đã "OK".

Người dùng đã uỷ quyền toàn bộ quyết định kỹ thuật (2026-09-16) — không hỏi lại,
tự chọn đánh đổi và ghi lại lý do tại chỗ.

## Thứ tự thực hiện

| # | Gói | Đơn vị công việc | Dòng sheet |
|---|---|---|---|
| A1 | Hồ sơ | Nơi cấp CCCD dạng chọn | d4 |
| A2 | Hồ sơ | Hạ tầng đính kèm (GridFS) + ảnh CCCD, SYLL, bằng cấp, người phụ thuộc | d4,6,7 |
| A3 | Hồ sơ | Số sổ BH | d5 |
| A4 | Hồ sơ | Bỏ "Trạng thái" khỏi tab Công việc | d8 |
| A5 | Hồ sơ | Tab Lương: bỏ số NPT + phụ cấp cố định, phụ cấp động, ngày báo tăng BH | d9 |
| A6 | Lương | Cấu hình lương: cờ "đóng BHXH" cho từng khoản + engine dùng nó | d9 |
| A7 | Hồ sơ | Bảng khai báo lao động theo mẫu Bảo hiểm | d9 (cột G) |
| A8 | HĐ | Cảnh báo tạo hợp đồng trùng nhân viên | d10 |
| A9 | HĐ | Nạp 6 mẫu in hợp đồng từ `docs/Mau_hop_dong` | d11 |
| O1 | Tổ chức | Sơ đồ tổ chức (cây đơn vị + chức danh), đồng bộ phân quyền | d13 |
| B1 | Biến động | Quá trình công tác: gộp thôi việc, chức danh theo cây, lương mới đẩy về hồ sơ, chứng từ bắt buộc, sinh phụ lục HĐ | d13 |
| B2 | Biến động | Thôi việc: đính kèm BB bàn giao/thanh lý/đơn | d14 |
| C1 | Công | Chấm công: làm từ xa/tại VP, vào/ra, tổng giờ ngày | d16 |
| C2 | Công | Bảng giờ làm thực tế + loại hình online không ăn ca/xăng xe | d16,19 |
| C3 | Công | Gửi bảng công cho NLĐ xác nhận, có hạn và tự khoá | d19 |
| C4 | Công | Bản ghi: ẩn người đã nghỉ từ tháng trước | d20 |
| C5 | Công | Quỹ phép cộng dồn theo tháng (bỏ cấp đầu năm) | d21 |
| C6 | Công | Gộp Cấu hình ca + Cấu hình chấm công | d24,28 |
| D1 | Lương | Tạm ứng lương: đơn → duyệt → vào bảng lương | d30 |
| D2 | Lương | Bảng lương thêm giờ theo mẫu | d31 |
| D3 | Lương | Bản in bảng lương chọn chỉ tiêu + sửa khấu trừ thuế | d32 |
| D4 | Lương | Bảng BHXH theo mẫu | d33 |
| D5 | Lương | Quyết toán TNCN theo kỳ tự chọn | d34 |
| D6 | Lương | Công đoàn theo kỳ | d35 |
| D7 | Lương | Phiếu lương theo mẫu + gửi, NLĐ chỉ xem của mình | d36 |
| E1 | Báo cáo | Báo cáo tình hình sử dụng lao động 6 tháng | d48 |
| E2 | Báo cáo | Báo cáo nhân sự nối dữ liệu công/phép | d47 |

## Tiến độ

- [x] A1 Nơi cấp CCCD dạng chọn — `CaNhanTab` + `NOI_CAP_CCCD_OPTIONS`
- [x] A2 Hạ tầng đính kèm `dinh_kem` (GridFS) + ô đính kèm ở 6 chỗ
- [x] A3 Số sổ BH
- [x] A4 Bỏ ô Trạng thái khỏi tab Công việc (thành chỉ-đọc)
- [x] A5 Tab Lương: bỏ phụ cấp cố định + số NPT, thêm mốc báo tăng BH
- [x] A6 Cờ "Tính vào nền BHXH" + căn cứ `LUONG_VA_PHU_CAP` (`tinhNenBHXH`)
- [x] A7 Bảng khai báo lao động BH (xuất Excel)
- [x] A8 Cảnh báo tạo hợp đồng trùng nhân viên
- [x] A9 6 mẫu in hợp đồng từ `docs/Mau_hop_dong`
- [x] O1 Sơ đồ tổ chức (cây + chức danh cho hồ sơ)
- [x] B1 Quá trình công tác — lương mới đẩy về hồ sơ, chứng từ bắt buộc, phụ lục HĐ
- [x] B2 Thôi việc — chứng từ bàn giao, tự ghi dòng quá trình, cờ tuyển thay thế
- [x] C1 Làm từ xa / tại văn phòng khi chấm công (có cờ bật ở Cấu hình)
- [x] C2 Tổng giờ trong ngày + bảng giờ làm thực tế (xuất Excel)
- [x] C3 Gửi bảng công cho NLĐ xác nhận, có hạn, tự khoá
- [x] C4 Ẩn người nghỉ từ tháng trước ở Bản ghi chấm công
- [x] C5 Quỹ phép cộng dồn theo tháng (cơ chế đã có từ P3.10 — sửa nhãn cho đúng)
- [x] C6 Gộp Cấu hình ca + Cấu hình chấm công thành một màn hai tab
- [x] D1 Tạm ứng lương có duyệt, nối vào ô Tạm ứng của bảng lương
- [x] D2 Bảng lương thêm giờ theo mẫu (thêm cột Chức danh; đơn giá đã theo lương cơ bản)
- [x] D3 Bản in bảng lương chọn chỉ tiêu + sửa khấu trừ thuế của NLĐ
- [x] D4 Bảng BHXH theo mẫu (5 quỹ, tổng 32%)
- [x] D5 Thuế TNCN theo kỳ Tháng/Quý/Năm/Tự chọn
- [x] D6 Danh sách phí công đoàn theo kỳ
- [x] D7 Gửi phiếu lương + bố cục phiếu theo mẫu
- [x] E1 Báo cáo tình hình sử dụng lao động (xuất Excel + in)
- [x] E2 Báo cáo nhân sự nối dữ liệu thật (chỉ số nào chưa có nguồn thì nói rõ)

## Việc BẮT BUỘC khi deploy

1. `ops/grant-quyen-module-moi.ts` — module quyền mới `/nhan-su/so-do-to-chuc`.
   Không chạy thì màn Sơ đồ tổ chức 403 với tất cả mọi người.
   Đợt này có HAI module quyền mới: `/nhan-su/so-do-to-chuc` và `/luong/tam-ung`.
2. `ops/chuyen-phucapcodinh-sang-khoan.ts` — di trú ô "Phụ cấp cố định" đã bỏ
   khỏi hồ sơ sang mức riêng theo khoản.

## Việc CHƯA làm (đúng theo cột "Tình trạng" của sheet)

- Phân hệ **IV. Đào tạo & Phát triển** và **V. Tuyển dụng**: sheet ghi "Bổ sung
  sau". Cờ `canTuyenThayThe` ở hồ sơ thôi việc đã ghi nhận sẵn nhu cầu tuyển
  thay thế để phân hệ Tuyển dụng đọc khi có.
- Ba chỉ số của Báo cáo nhân sự (vượt thử việc, hồ sơ pháp lý đầy đủ, giữ chân
  nhân sự cốt cán) vẫn ở trạng thái "chưa có nguồn" — cần mốc đánh giá thử
  việc, quy định hồ sơ bắt buộc và cờ nhân sự cốt cán.
