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
  const homNay = homNayVN();
  const [ngayDangXem] = useChamCongCuaToiState("ngayDangXem", homNay);

  if (!homNayTrangThai) return null;

  const ngay = bayNgayTu(tuanBatDau);
  const theoNgay = gomTheoNgay(banGhiTuan);

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
          const dangChon = n === ngayDangXem;
          // "Hôm nay" (nền + outline accent) và "đang chọn" (viền riêng) là hai
          // khái niệm khác nhau — bấm sang ngày khác vẫn phải thấy được đâu là
          // hôm nay thật, không chỉ đâu là ngày đang xem.
          const style: React.CSSProperties = laHomNay
            ? { background: "var(--emp-accent-nhat)", outline: "1.5px solid var(--emp-accent)" }
            : {};
          if (dangChon && !laHomNay) {
            style.border = "1.5px solid var(--emp-text)";
          }
          return (
            <button
              key={n}
              type="button"
              aria-label={String(Number(n.slice(8, 10)))}
              aria-pressed={dangChon}
              // Mockup cho .week-day `cursor: pointer` (dòng 71) — mỗi ngày
              // phải bấm được để xem lịch sử ngày đó, không chỉ hai nút ‹ ›.
              onClick={() => handler.executeEvent("chonNgay", { ngay: n })}
              // Bo tròn rõ (16px) cho khớp nhịp bo mềm của nút chấm công dạng
              // viên thuốc. Cố ý KHÔNG bo tròn hoàn toàn: ô ngày cao hơn rộng
              // (thứ + số + chấm) nên rounded-full sẽ kéo thành viên thuốc dọc.
              className="rounded-2xl border-0 bg-transparent py-1.5 text-center"
              style={style}
            >
              <div className="mb-0.5 text-[10px] text-[color:var(--emp-muted)]">{TEN_THU[i]}</div>
              <div className="mb-1 text-[13px] font-semibold">{Number(n.slice(8, 10))}</div>
              <div
                className="mx-auto h-1.5 w-1.5 rounded-full"
                style={{ background: MAU[mauChamNgay(theoNgay[n])] }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
