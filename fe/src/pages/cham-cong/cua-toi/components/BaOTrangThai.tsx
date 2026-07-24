import type { ReactNode } from "react";
import {
  CarryOutOutlined,
  LoginOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useChamCongCuaToiState } from "../ChamCongCuaToiHandlerContext";
import { AttendanceRecord, TrangThaiHomNay } from "@/services/attendanceRecordService";
import { homNayVN } from "@/ultils/thoiGianVN";
import { baOTrangThai } from "../oTrangThai";
import { duLieuNgay } from "../ngayDangXem";
import "./NutCham.state";
import "./LichTuan.state";

/**
 * Icon riêng cho từng ô — theo thứ tự "giờ vào · giờ ra · công" mà
 * `baOTrangThai()` dựng. Cố ý KHÔNG dùng một dấu ✓ chung cho cả ba: dấu ✓
 * trùng với dấu "chấm công thành công" ở dialog, và không phân biệt được ô
 * nào là gì. Vào/ra dùng đúng cặp mũi tên của nút chấm (Login/Logout) cho
 * đồng nhất; công dùng ô-đã-đánh-dấu.
 */
const ICON_O: ReactNode[] = [
  <LoginOutlined key="vao" />,
  <LogoutOutlined key="ra" />,
  <CarryOutOutlined key="cong" />,
];

/** Ba ô: giờ vào · giờ ra · công. Xanh = xong, đỏ = chưa. */
export function BaOTrangThai() {
  const [homNay] = useChamCongCuaToiState("homNay", null as TrangThaiHomNay | null);
  const [ngayDangXem] = useChamCongCuaToiState("ngayDangXem", homNayVN());
  const [banGhiTuan] = useChamCongCuaToiState("banGhiTuan", [] as AttendanceRecord[]);
  if (!homNay) return null;

  // 3 ô đi theo NGÀY ĐANG XEM, không phải luôn luôn hôm nay — nhưng hôm nay
  // vẫn lấy từ `homNay` (tươi nhất), không từ `banGhiTuan` (dl.laHomNay lo
  // việc đó bên trong duLieuNgay()).
  const dl = duLieuNgay(ngayDangXem, homNayVN(), homNay, banGhiTuan);
  const o = baOTrangThai({ ...homNay, banGhi: dl.banGhi, soCong: dl.soCong });

  return (
    <section className="emp-card emp-status mb-4">
      {o.map((x, i) => (
        <div key={x.nhan} className={`emp-status-cell ${x.xanh ? "done" : "wait"}`}>
          <div className="emp-status-head">
            <span aria-hidden>{ICON_O[i]}</span>
            {x.nhan}
          </div>
          <div className="emp-status-val">{x.giaTri}</div>
          <span className="emp-status-chip">{x.ghiChu}</span>
        </div>
      ))}
    </section>
  );
}
