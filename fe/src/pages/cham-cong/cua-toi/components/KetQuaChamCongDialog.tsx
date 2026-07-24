import type { ReactNode } from "react";
import { Button, Modal } from "antd";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  ExclamationCircleFilled,
} from "@ant-design/icons";
import { AttendanceRecord } from "@/services/attendanceRecordService";
import { gioVN } from "@/ultils/thoiGianVN";

export interface KetQuaChamCongDialogProps {
  open: boolean;
  onClose: () => void;
  /**
   * Bản ghi vừa tạo thành công (chấm vào/ra). `null` nghĩa là lượt bấm này
   * thất bại — khi đó nhìn vào `laSaiThuTu` để chọn biến thể lỗi còn lại.
   */
  banGhiVuaTao: AttendanceRecord | null;
  /**
   * true khi lượt bấm này là lỗi sai thứ tự vào/ra (TrangThai.SAI_THU_TU).
   * Chỉ có ý nghĩa khi `banGhiVuaTao` là null.
   */
  laSaiThuTu: boolean;
  /**
   * Câu hiển thị cho hai biến thể lỗi (sai thứ tự / lỗi tạm thời khác) —
   * nguyên văn câu backend trả về, hoặc câu mặc định của FE. Không dùng cho
   * biến thể thành công/ngoài vùng vì hai biến thể đó tự dựng câu từ chính
   * `banGhiVuaTao` (giờ, địa điểm, khoảng cách).
   */
  cau: string;
}

type BienThe = "thanh_cong" | "ngoai_vung" | "sai_thu_tu" | "loi";

/**
 * Dialog hiện KẾT QUẢ của một lượt bấm nút chấm công. Thay cho 3 Alert nội
 * dòng trước đây (thành công/ngoài vùng, lỗi tạm thời, sai thứ tự) — gộp về
 * một chỗ vì cả ba đều nói về CÙNG một sự kiện: cú bấm vừa rồi.
 *
 * Cố ý KHÔNG bao gồm nhánh CHAN_CHAM_CONG (thiết bị chờ duyệt/bị từ chối...):
 * đó là trạng thái ĐỨNG YÊN có lối ra (ô đặt tên máy, nút gửi HR duyệt), không
 * phải kết quả của một cú bấm — biến nó thành dialog thì đóng dialog lại sẽ để
 * lại màn hình câm, không còn cách nào thao tác tiếp.
 */
export function KetQuaChamCongDialog({
  open,
  onClose,
  banGhiVuaTao,
  laSaiThuTu,
  cau,
}: KetQuaChamCongDialogProps) {
  const bienThe: BienThe = banGhiVuaTao
    ? banGhiVuaTao.ngoaiVung
      ? "ngoai_vung"
      : "thanh_cong"
    : laSaiThuTu
      ? "sai_thu_tu"
      : "loi";

  const CAU_HINH: Record<
    BienThe,
    { icon: ReactNode; mau: string; tieuDe: string }
  > = {
    thanh_cong: {
      icon: <CheckCircleFilled />,
      mau: "#1f7769",
      tieuDe: `Đã chấm công ${banGhiVuaTao?.loai === "vao" ? "vào" : "ra"} thành công`,
    },
    ngoai_vung: {
      icon: <ExclamationCircleFilled />,
      mau: "#faad14",
      tieuDe: "Đã ghi nhận — ngoài khu vực cho phép",
    },
    sai_thu_tu: {
      icon: <ExclamationCircleFilled />,
      mau: "#faad14",
      tieuDe: "Sai thứ tự vào/ra",
    },
    loi: {
      icon: <CloseCircleFilled />,
      mau: "#ef4444",
      tieuDe: "Chưa chấm công được",
    },
  };

  const { icon, mau, tieuDe } = CAU_HINH[bienThe];

  // Giữ NGUYÊN VĂN câu mô tả mà 3 Alert cũ từng dựng — chỉ đổi chỗ hiện,
  // không đổi chữ. Hai biến thể thành công/ngoài vùng tự dựng từ banGhiVuaTao
  // (giờ máy chủ, địa điểm, khoảng cách); hai biến thể lỗi dùng nguyên `cau`.
  let moTa = cau;
  if (bienThe === "thanh_cong" && banGhiVuaTao) {
    moTa = `Ghi lúc ${gioVN(banGhiVuaTao.thoiDiem)}${
      banGhiVuaTao.locationTen ? ` tại ${banGhiVuaTao.locationTen}` : ""
    }.`;
  } else if (bienThe === "ngoai_vung" && banGhiVuaTao) {
    moTa = `Ghi lúc ${gioVN(banGhiVuaTao.thoiDiem)}${
      banGhiVuaTao.khoangCachMet !== undefined
        ? `, cách điểm chấm công gần nhất khoảng ${Math.round(banGhiVuaTao.khoangCachMet)}m`
        : ""
    }. Bạn đang ở ngoài khu vực cho phép, HR sẽ xem xét. Không cần chấm lại.`;
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      centered
      closable
      maskClosable
      footer={[
        <Button key="dong" type="primary" onClick={onClose}>
          Đóng
        </Button>,
      ]}
    >
      {/* Màn hình điện thoại: icon lớn + căn giữa toàn bộ, không phải bảng
          chữ căn trái như dialog trên desktop thường thấy. */}
      <div className="text-center py-4">
        <div style={{ fontSize: 48, color: mau, lineHeight: 1 }}>{icon}</div>
        <div className="mt-3 text-lg font-semibold">{tieuDe}</div>
        <div className="mt-2 text-sm text-gray-500">{moTa}</div>
      </div>
    </Modal>
  );
}
