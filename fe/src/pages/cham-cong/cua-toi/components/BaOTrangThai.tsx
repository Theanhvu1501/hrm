import { useChamCongCuaToiState } from "../ChamCongCuaToiHandlerContext";
import { AttendanceRecord, TrangThaiHomNay } from "@/services/attendanceRecordService";
import { homNayVN } from "@/ultils/thoiGianVN";
import { baOTrangThai } from "../oTrangThai";
import { duLieuNgay } from "../ngayDangXem";
import "./NutCham.state";
import "./LichTuan.state";

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
      {o.map((x) => (
        <div
          key={x.nhan}
          className="relative rounded-[var(--emp-radius)] border-2 px-2 py-3.5 text-center"
          style={{
            borderColor: x.xanh ? "var(--emp-accent)" : "var(--emp-danger)",
            background: x.xanh ? "var(--emp-accent-nhat)" : "var(--emp-danger-nhat)",
          }}
        >
          {x.xanh && (
            <span
              className="absolute right-2 top-1.5 text-sm"
              style={{ color: "var(--emp-accent)" }}
              aria-hidden
            >
              ✓
            </span>
          )}
          <div className="mb-1 text-[11px] font-medium text-[color:var(--emp-text-phu)]">
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
