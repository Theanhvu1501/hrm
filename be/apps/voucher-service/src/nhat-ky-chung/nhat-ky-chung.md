# Báo cáo: Chức năng Số dư đầu kỳ

## 1. Mục đích

Khi một công ty bắt đầu sử dụng phần mềm từ giữa kỳ kế toán (không có dữ liệu chứng từ lịch sử), các báo cáo hiện tại luôn hiển thị **số dư đầu kỳ = 0**, dẫn đến số liệu không chính xác.

Chức năng **Số dư đầu kỳ** cho phép người dùng nhập thủ công số dư đầu kỳ cho từng tài khoản. Hệ thống sẽ tự động cộng phần số dư này vào các báo cáo liên quan để xác định chính xác số dư đầu kỳ và số dư cuối kỳ.

---

## 2. Giao diện người dùng

### Menu

**Danh mục → Số dư đầu kỳ**

### Chức năng

- Hiển thị danh sách toàn bộ tài khoản chi tiết.
- Cho phép nhập:
  - Dư Nợ đầu kỳ
  - Dư Có đầu kỳ
- Một trường **Ngày áp dụng** dùng chung cho toàn bộ dữ liệu số dư đầu kỳ.
- Hiển thị:
  - Tổng Dư Nợ
  - Tổng Dư Có
- Cảnh báo khi Tổng Dư Nợ và Tổng Dư Có không cân bằng (vẫn cho phép lưu).
- Hỗ trợ tìm kiếm theo:
  - Mã tài khoản
  - Tên tài khoản
- Nút **Lưu** để ghi nhận dữ liệu.

---

## 3. Phạm vi áp dụng

Sau khi nhập số dư đầu kỳ, hệ thống sẽ tự động cộng vào các báo cáo sau:

| Báo cáo                | Thay đổi                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Bảng cân đối phát sinh | Cột **Số dư đầu kỳ** và **Số dư cuối kỳ** phản ánh đúng số liệu. Số dư đầu kỳ = Số dư đầu kỳ nhập thủ công + Phát sinh trước kỳ báo cáo |
| Bảng cân đối kế toán   | Giá trị tài sản và nguồn vốn được cộng thêm phần số dư đầu kỳ của các tài khoản tương ứng                                               |

### Không áp dụng

Các báo cáo sau **không sử dụng số dư đầu kỳ nhập thủ công**:

- Sổ cái chi tiết
- Báo cáo kết quả kinh doanh

> Đây là phạm vi đã được thống nhất. Nếu không nhập số dư đầu kỳ, các báo cáo vẫn hoạt động như hiện tại và không bị ảnh hưởng.

---

## 4. Nguyên tắc đảm bảo tính chính xác

### 4.1 Không cộng trùng dữ liệu

Số dư đầu kỳ thể hiện trạng thái của tài khoản tại thời điểm bắt đầu sử dụng hệ thống.

Các chứng từ phát sinh sau ngày áp dụng sẽ được xử lý theo luồng hiện tại và không được cộng lại vào số dư đầu kỳ.

### 4.2 Nhập tại tài khoản chi tiết

Số dư đầu kỳ chỉ được nhập tại các tài khoản chi tiết.

Việc này giúp tránh tình trạng cộng trùng khi hệ thống tổng hợp dữ liệu từ tài khoản con lên tài khoản cha trên các báo cáo.

### 4.3 Tách biệt dữ liệu theo công ty

Dữ liệu số dư đầu kỳ được lưu riêng cho từng công ty (tenant).

- Công ty A chỉ xem và chỉnh sửa dữ liệu của Công ty A.
- Công ty B không thể xem hoặc ghi đè dữ liệu của Công ty A.

---

## 5. Kết quả đạt được

Sau khi triển khai chức năng:

- Doanh nghiệp có thể bắt đầu sử dụng hệ thống từ bất kỳ thời điểm nào trong năm.
- Không cần nhập lại toàn bộ chứng từ lịch sử để có số dư chính xác.
- Bảng cân đối phát sinh và Bảng cân đối kế toán phản ánh đúng tình trạng tài chính thực tế tại thời điểm bắt đầu sử dụng hệ thống.
- Không ảnh hưởng đến các báo cáo và chức năng hiện có khi không sử dụng tính năng này.
