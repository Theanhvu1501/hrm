import { apiErrorMessage } from "@/config/api";
import { layStatus } from "@/pages/cham-cong/cua-toi/trangThai";
import { maLoiChamCong } from "@/services/attendanceRecordService";
import { MA_LOI_QUY_PHEP } from "@/services/leaveBalanceService";

/**
 * Đổi một lỗi API thành câu tiếng Việt hiện thẳng lên màn hình nhân viên.
 *
 * Vì sao không dùng thẳng `apiErrorMessage`: ba mã status dưới đây có nghĩa
 * rất cụ thể ở luồng đơn từ, và câu backend trả về không nói cho nhân viên
 * biết họ phải làm gì tiếp.
 *
 * - 404 ở `/cua-toi`: `resolveEmployeeFromUser()` không tìm được hồ sơ nhân
 *   viên gắn với tài khoản → việc cần làm là gọi HR, không phải bấm thử lại.
 * - 401: hết phiên → đăng nhập lại.
 * - 403: từ Task 4, nhân viên thường KHÔNG có `/cham-cong/don-tu:*`. Nếu màn
 *   này ăn 403 nghĩa là đang gọi nhầm route quản trị — nói thẳng để người
 *   dùng báo lại chứ không im lặng nuốt.
 */
export function thongDiepLoiDon(err: unknown, macDinh: string): string {
  const status = layStatus(err);

  if (status === 404) {
    return "Tài khoản của bạn chưa được gắn với hồ sơ nhân viên. Vui lòng liên hệ HR.";
  }
  if (status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }

  // P3.8: nộp đơn phép năm khi hồ sơ chưa lên chính thức (chưa có quỹ) hoặc
  // không đủ số dư — cả hai đều 409. Đọc `code`, KHÔNG so khớp chuỗi tiếng
  // Việt (đổi câu chữ backend một lần là FE hỏng im lặng) — cùng quy ước với
  // MA_LOI_THIET_BI/MA_LOI_DON_CHAM_CONG. Message vẫn lấy NGUYÊN VĂN từ
  // backend ở nhánh chung bên dưới (nó đã soạn sẵn câu đúng — KHONG_DU_SO_DU
  // còn liệt kê số dư từng quỹ theo năm); `code` chỉ đổi câu MẶC ĐỊNH cho lối
  // lùi hiếm khi backend lỡ không kèm message, thay vì câu chung chung
  // "Không nộp được đơn" sai bản chất lỗi.
  const ma = maLoiChamCong(err);
  const macDinhCuoi =
    ma === MA_LOI_QUY_PHEP.CHUA_LEN_CHINH_THUC ||
    ma === MA_LOI_QUY_PHEP.KHONG_DU_SO_DU
      ? "Không đủ điều kiện nghỉ phép năm."
      : macDinh;

  // Với 4xx còn lại (400 do validate, 403 do luật huỷ đơn...) backend nói rõ
  // lý do hơn bất cứ câu nào FE tự bịa ra — dùng nguyên văn.
  return apiErrorMessage(err, macDinhCuoi);
}
