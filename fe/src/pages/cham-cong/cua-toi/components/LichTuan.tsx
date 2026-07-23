import { useChamCongCuaToiHandler, useChamCongCuaToiState } from "../ChamCongCuaToiHandlerContext";
import { AttendanceRecord, TrangThaiHomNay } from "@/services/attendanceRecordService";
import { homNayVN } from "@/ultils/thoiGianVN";
import { bayNgayTu, dauTuanCua, gomTheoNgay, mauChamNgay, nhanTuan } from "../lichTuan";
import "./LichTuan.state";

const TEN_THU = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const MAU: Record<string, string> = {
  xanh: "var(--emp-accent)",
  do: "var(--emp-danger)",
  xam: "var(--emp-border)",
};

export function LichTuan() {
  const handler = useChamCongCuaToiHandler();
  // Cùng cờ chặn mà 3 component anh em (ShiftCard, BaOTrangThai, NutCham
  // nhánh 4) đều dựa vào: `init` set về null trên màn hình chặn (chưa liên
  // kết hồ sơ, thiết bị bị chặn…). Thiếu guard này thì dải 7 ngày với nút
  // ‹ › vẫn nổi lên rỗng ngay trên thông báo chặn — trông như nửa trang còn
  // dùng được trong khi cả màn hình đang khoá.
  const [homNayTrangThai] = useChamCongCuaToiState("homNay", null as TrangThaiHomNay | null);
  const [tuanBatDau] = useChamCongCuaToiState("tuanBatDau", dauTuanCua(homNayVN()));
  const [banGhiTuan] = useChamCongCuaToiState("banGhiTuan", [] as AttendanceRecord[]);
  const [dangTaiTuan] = useChamCongCuaToiState("dangTaiTuan", false);

  if (!homNayTrangThai) return null;

  const ngay = bayNgayTu(tuanBatDau);
  const theoNgay = gomTheoNgay(banGhiTuan);
  const homNay = homNayVN();

  return (
    <div className="emp-card mb-4 p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-[color:var(--emp-text-phu)]">
          {nhanTuan(tuanBatDau)}
        </span>
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-label="Tuần trước"
            disabled={dangTaiTuan}
            className="h-[26px] w-[26px] rounded-md border border-[color:var(--emp-border)] text-[color:var(--emp-text-phu)]"
            onClick={() => handler.executeEvent("doiTuan", { lech: -1 })}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Tuần sau"
            disabled={dangTaiTuan}
            className="h-[26px] w-[26px] rounded-md border border-[color:var(--emp-border)] text-[color:var(--emp-text-phu)]"
            onClick={() => handler.executeEvent("doiTuan", { lech: 1 })}
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {ngay.map((n, i) => {
          const laHomNay = n === homNay;
          return (
            <div
              key={n}
              className="rounded-lg py-1.5 text-center"
              style={
                laHomNay
                  ? { background: "var(--emp-accent-nhat)", outline: "1.5px solid var(--emp-accent)" }
                  : undefined
              }
            >
              <div className="mb-0.5 text-[10px] text-[color:var(--emp-muted)]">{TEN_THU[i]}</div>
              <div className="mb-1 text-[13px] font-semibold">{Number(n.slice(8, 10))}</div>
              <div
                className="mx-auto h-1.5 w-1.5 rounded-full"
                style={{ background: MAU[mauChamNgay(theoNgay[n])] }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
