import { CreateEmployeeDto } from "@/services/employeeService";
import { HoSoNhanVienFormValues } from "./HoSoNhanVienForm.state";

/**
 * Dựng DTO gửi lên BE từ giá trị form.
 *
 * Tách khỏi component để test được: đúng/sai ở đây không nhìn thấy được trên
 * màn hình (form vẫn báo "Cập nhật thành công" cả khi trường không hề được
 * ghi), nên chỉ có test mới bắt được lỗi.
 *
 * QUY TẮC CHUNG cho mọi trường có thể bị XOÁ TRẮNG: phải gửi giá trị rỗng
 * thật (`""` hoặc `[]`), KHÔNG gửi `undefined`. Lý do:
 *   - `ServiceBase` dùng `transformRequest: JSON.stringify`, mà
 *     `JSON.stringify` loại hẳn khoá mang `undefined` khỏi body;
 *   - `NhanVien_Service.update` là `Object.assign(item, dto)` — trường không
 *     có trong body thì không đổi.
 * Gộp hai điều đó lại: gửi `undefined` = "giữ nguyên giá trị cũ", không phải
 * "xoá".
 */
export function toCreateEmployeeDto(
  values: HoSoNhanVienFormValues
): CreateEmployeeDto {
  return {
    hoTen: values.hoTen,
    cccd: values.cccd,
    ngaySinh: values.ngaySinh || undefined,
    gioiTinh: values.gioiTinh || undefined,
    mst: values.mst || undefined,
    soDienThoai: values.soDienThoai || undefined,
    email: values.email || undefined,
    diaChi: values.diaChi || undefined,
    phongBan: values.phongBan || undefined,
    chucDanh: values.chucDanh || undefined,
    ngayVaoLam: values.ngayVaoLam || undefined,
    loaiHopDong: values.loaiHopDong,
    trangThai: values.trangThai,
    bangCap: (values.bangCap || []).filter((b) => b.ten?.trim()),
    nguoiPhuThuoc: (values.nguoiPhuThuoc || []).filter((n) => n.hoTen?.trim()),

    // Hai trường này BẮT BUỘC theo quy tắc trên (xem docblock đầu file).
    // Nếu gửi `undefined`: HR gán nhầm tài khoản người B cho hồ sơ người A,
    // phát hiện sai, xoá ô đó rồi lưu lại — màn hình báo "Cập nhật thành
    // công" nhưng liên kết vẫn nguyên; sau đó gán tài khoản B cho đúng hồ sơ
    // B thì nhận 409 "Tài khoản này đã được liên kết với một nhân viên
    // khác". Không còn lối ra nào từ giao diện, và B chấm công vào hồ sơ của
    // A cho tới khi có người sửa thẳng MongoDB. Với `workShiftId` thì bỏ ca
    // của một nhân viên là bất khả thi từ giao diện.
    //
    // Chuỗi rỗng an toàn ở BE: DTO khai `@IsOptional() @IsString()` nên `""`
    // hợp lệ, và nhánh kiểm trùng `if (dto.userId && ...)` bỏ qua chuỗi rỗng
    // đúng như mong muốn — gỡ liên kết thì không có gì để kiểm trùng.
    userId: values.userId || "",
    workShiftId: values.workShiftId || "",

    // Cùng quy tắc, dạng mảng: bỏ tick hết ngày rồi lưu phải thực sự xoá
    // được cấu hình cũ. `[]` mang đúng nghĩa "chưa cấu hình".
    ngayLamViecTrongTuan: values.ngayLamViecTrongTuan || [],
  };
}
