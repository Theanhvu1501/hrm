import { apiErrorMessage } from "@/config/api";
import { layStatus } from "@/pages/cham-cong/cua-toi/trangThai";

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

  // Với 4xx còn lại (400 do validate, 403 do luật huỷ đơn...) backend nói rõ
  // lý do hơn bất cứ câu nào FE tự bịa ra — dùng nguyên văn.
  return apiErrorMessage(err, macDinh);
}
