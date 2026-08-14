import { ReactNode } from "react";
import {
  FileTextOutlined,
  FieldTimeOutlined,
  CoffeeOutlined,
  RetweetOutlined,
  LaptopOutlined,
} from "@ant-design/icons";
import { AttendanceRequestType } from "@/services/attendanceRequestService";

/**
 * Mặt hình từng loại đơn ở màn nhân viên: mỗi loại một ô bo góc kiểu icon app
 * iOS — nền gradient, glyph trắng ở giữa.
 *
 * Để RIÊNG khỏi `constants.ts` (file dùng chung với màn quản trị HR): icon và
 * gradient chỉ là ngôn ngữ thị giác của vỏ `/toi`, không nên rò sang bảng biểu
 * bên quản trị. Nhãn chữ vẫn lấy từ `LOAI_DON_OPTIONS` để một chỗ đổi chữ là
 * đổi cả hai màn.
 *
 * Màu chọn theo bảng màu hệ thống của iOS (blue/orange/green/purple/teal) để
 * mỗi loại đơn có một danh tính màu ổn định, người dùng nhận ra bằng màu trước
 * khi đọc chữ.
 */
export interface MatHinhLoai {
  icon: ReactNode;
  gradient: string;
}

export const MAT_HINH_LOAI: Record<AttendanceRequestType, MatHinhLoai> = {
  // Giải trình: một tờ văn bản giải thích → icon tài liệu, xanh dương.
  giai_trinh: {
    icon: <FileTextOutlined />,
    gradient: "linear-gradient(135deg, #4aa3ff, #0a84ff)",
  },
  // Làm thêm giờ: đồng hồ có kim giờ → cam (màu cảnh báo/thời gian của iOS).
  lam_them_gio: {
    icon: <FieldTimeOutlined />,
    gradient: "linear-gradient(135deg, #ffb340, #ff9500)",
  },
  // Nghỉ phép: tách cà phê nghỉ ngơi → xanh lá.
  nghi_phep: {
    icon: <CoffeeOutlined />,
    gradient: "linear-gradient(135deg, #5de27a, #34c759)",
  },
  // Nghỉ bù: mũi tên đổi/hoán → tím.
  nghi_bu: {
    icon: <RetweetOutlined />,
    gradient: "linear-gradient(135deg, #d07bf5, #af52de)",
  },
  // Làm online: máy tính xách tay → teal. Màu thứ năm của bảng màu iOS, chưa
  // loại nào dùng, nên không bị nhầm với bốn ô còn lại khi liếc nhanh.
  lam_online: {
    icon: <LaptopOutlined />,
    gradient: "linear-gradient(135deg, #5ac8fa, #32ade6)",
  },
};
