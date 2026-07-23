import { useChamCongCuaToiState } from "../ChamCongCuaToiHandlerContext";
import { TrangThaiHomNay } from "@/services/attendanceRecordService";
import { gioVN } from "@/ultils/thoiGianVN";
import "./NutCham.state";

/**
 * Chi tiết từng lượt chấm, thu gọn mặc định.
 *
 * Ca qua đêm: lúc 00:30, lượt vào lúc 22:00 thuộc NGÀY CÔNG hôm trước nên
 * `ngayCong !== ngay`. Backend đã trả đúng bản ghi của ngày công đó; việc
 * của giao diện là gọi tên cho đúng — đề "Hôm nay" lên một lượt vào từ hôm
 * trước sẽ đọc như dữ liệu sai.
 */
export function ChiTietChamCong() {
  const [homNay] = useChamCongCuaToiState("homNay", null as TrangThaiHomNay | null);
  if (!homNay) return null;

  const caQuaDemTuHomTruoc = homNay.ngayCong !== homNay.ngay;
  const tieuDe = caQuaDemTuHomTruoc
    ? `Chi tiết ca ngày ${homNay.ngayCong} (chưa kết thúc)`
    : "Chi tiết chấm công";

  return (
    <details className="emp-card mt-4">
      <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-semibold text-[color:var(--emp-text-phu)]">
        📋 {tieuDe}
      </summary>
      <div className="px-4 pb-3.5">
        {homNay.banGhi.length === 0 ? (
          <div className="py-4 text-center text-[13px] text-[color:var(--emp-muted)]">
            Chưa có lượt chấm công nào
          </div>
        ) : (
          homNay.banGhi.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between border-t border-[color:var(--emp-border)] py-2.5 first:border-t-0"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
                  style={
                    b.loai === "vao"
                      ? { background: "#d1fae5", color: "#065f46" }
                      : { background: "#dbeafe", color: "#1e40af" }
                  }
                >
                  {b.loai === "vao" ? "Vào" : "Ra"}
                </span>
                <div>
                  <div className="text-[15px] font-semibold">{gioVN(b.thoiDiem)}</div>
                  <div className="mt-0.5 text-[11px] text-[color:var(--emp-muted)]">{b.ngay}</div>
                </div>
              </div>
              <div className="text-right text-xs">
                <div>{b.locationTen ?? "—"}</div>
                <div className="mt-0.5 text-[11px] text-[color:var(--emp-muted)]">
                  {b.phuongThuc === "gps" ? "📡 GPS" : b.phuongThuc === "wifi" ? "📶 Wifi" : "🔳 QR"}
                  {/* Ngoài vùng KHÔNG phải lỗi: bản ghi đã vào sổ, HR sẽ xem
                      xét. Hiện như lỗi thì người dùng bấm lại và đẻ ra rác. */}
                  {b.ngoaiVung && " · ngoài vùng"}
                  {b.nguonTao === "hr_nhap" && " · HR nhập"}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </details>
  );
}
