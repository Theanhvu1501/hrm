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
    <div className="mb-4 grid grid-cols-3 gap-2">
      {o.map((x, i) => (
        <div
          key={x.nhan}
          className="rounded-[var(--emp-radius)] border-2 px-2 py-3.5 text-center"
          style={{
            borderColor: x.xanh ? "var(--emp-accent)" : "var(--emp-danger)",
            background: x.xanh ? "var(--emp-accent-nhat)" : "var(--emp-danger-nhat)",
          }}
        >
          <div className="mb-1 flex items-center justify-center gap-1 text-[11px] font-medium text-[color:var(--emp-text-phu)]">
            <span
              className="text-[12px]"
              style={{ color: x.xanh ? "var(--emp-accent)" : "var(--emp-danger)" }}
              aria-hidden
            >
              {ICON_O[i]}
            </span>
            {x.nhan}
          </div>
          <div
            className="text-xl font-bold"
            style={{ color: x.xanh ? "var(--emp-accent)" : "var(--emp-danger)" }}
          >
            {x.giaTri}
          </div>
          <div className="mt-1 text-[10px] text-[color:var(--emp-muted)]">{x.ghiChu}</div>
        </div>
      ))}
    </div>
  );
}
