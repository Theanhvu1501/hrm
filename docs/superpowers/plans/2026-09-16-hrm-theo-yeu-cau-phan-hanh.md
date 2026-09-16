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

(cập nhật khi xong từng mục)
