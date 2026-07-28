import { Empty, Tag } from "antd";
import { LeaveBalance } from "@/services/leaveBalanceService";
import { ngayVN } from "@/ultils/thoiGianVN";
import { sapHetHan } from "@/pages/cham-cong/quy-phep/nhanQuy";

export interface KhoiSoDuPhepProps {
  danhSach: LeaveBalance[];
  /** "YYYY-MM-DD" — truyền vào thay vì tự gọi `homNayVN()` để test được. */
  homNay: string;
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
 * người dùng còn đang CHỌN NGÀY, không phải sau khi bấm Gửi.
 */
export function KhoiSoDuPhep({ danhSach, homNay }: KhoiSoDuPhepProps) {
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
