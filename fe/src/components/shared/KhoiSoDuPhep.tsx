import { Empty, Tag } from "antd";
import { LeaveBalance } from "@/services/leaveBalanceService";
import { ngayVN } from "@/ultils/thoiGianVN";
import { sapHetHan } from "@/pages/cham-cong/quy-phep/nhanQuy";

/**
 * P3.8 review round 1 (Important 1): ba tình huống "không có gì để hiện"
 * TRÔNG giống nhau (mảng rỗng) nhưng có NGUYÊN NHÂN và TRÁCH NHIỆM khác hẳn
 * nhau, nên không được gộp về một câu:
 *
 * - `undefined` (mặc định): mảng rỗng THẬT — nhân viên chưa có quỹ nào, ca
 *   phổ biến nhất là còn thử việc. Lỗi (nếu có) là của quy trình cấp phép.
 * - `'khong_co_quyen'`: KHÔNG PHẢI nhân viên thiếu phép — người đang xem
 *   (thường là HR) thiếu quyền `/cham-cong/quy-phep:xem`. Nói sai thành
 *   "nhân viên thử việc" ở đây từng khiến HR đẩy một người làm nhiều năm
 *   sang nghỉ không lương.
 * - `'loi_khac'`: lỗi tải (mạng, 500, tài khoản chưa gắn hồ sơ...) — không
 *   nói lên gì về việc nhân viên có quỹ hay không, phải mời thử lại.
 */
export type LoiSoDuPhep = "khong_co_quyen" | "loi_khac";

export interface KhoiSoDuPhepProps {
  danhSach: LeaveBalance[];
  /** "YYYY-MM-DD" — truyền vào thay vì tự gọi `homNayVN()` để test được. */
  homNay: string;
  /** Xem `LoiSoDuPhep`. Bỏ trống = không có lỗi, `danhSach` là sự thật. */
  loi?: LoiSoDuPhep;
}

/**
 * Số dư phép năm — TÁCH DÒNG theo năm, KHÔNG BAO GIỜ gộp thành một con số.
 *
 * Vì sao không gộp: một quỹ 2026 hết hạn 31/3/2027 và một quỹ 2027 là hai
 * thứ khác nhau — "còn 15 ngày" xoá mất thông tin 3 ngày nào trong số đó sắp
 * hết hạn, đúng lúc nhân viên cần biết nhất để tránh mất phép.
 *
 * Dùng ở BA nơi (Task 12): đầu trang "Đơn từ của tôi", ngay dưới ô chọn ngày
 * của form nhân viên, và ngay dưới ô chọn ngày của form HR — luôn ở chỗ
 * người dùng còn đang CHỌN NGÀY, không phải sau khi bấm Gửi. Đặt ở
 * `components/shared/` (không phải dưới `pages/toi/`) vì nó được import từ
 * cả module tự phục vụ (`pages/toi/don-tu`) lẫn module quản trị
 * (`pages/cham-cong/don-cham-cong`) — không thuộc riêng module nào.
 */
export function KhoiSoDuPhep({ danhSach, homNay, loi }: KhoiSoDuPhepProps) {
  if (loi === "khong_co_quyen") {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Bạn không có quyền xem quỹ phép. Liên hệ quản trị để được cấp quyền — đây KHÔNG phải là nhân viên chưa có phép."
      />
    );
  }

  if (loi === "loi_khac") {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Không tải được số dư phép. Thử lại sau."
      />
    );
  }

  if (danhSach.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Chưa có quỹ phép năm. Nhân viên đang thử việc chưa được cấp phép — có thể nộp đơn nghỉ không lương."
      />
    );
  }

  return (
    <div className="khoi-so-du-phep">
      {danhSach.map((quy) => (
        <div key={quy.id} className="khoi-so-du-phep-dong">
          <span>Phép năm {quy.nam}</span>
          <span>
            : còn {quy.soNgayConLai} / {quy.soNgayDuocCap} ngày
          </span>
          <span> — hạn dùng {ngayVN(quy.hanDung)}</span>
          {sapHetHan(quy, homNay) && (
            <Tag color="warning" style={{ marginLeft: 8 }}>
              Sắp hết hạn
            </Tag>
          )}
        </div>
      ))}
    </div>
  );
}
