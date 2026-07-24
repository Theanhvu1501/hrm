import type { ReactNode } from "react";
import {
  AimOutlined,
  HistoryOutlined,
  QrcodeOutlined,
  WifiOutlined,
} from "@ant-design/icons";
import { useChamCongCuaToiState } from "../ChamCongCuaToiHandlerContext";
import { AttendanceRecord, TrangThaiHomNay } from "@/services/attendanceRecordService";
import { gioGiayVN, homNayVN } from "@/ultils/thoiGianVN";
import { duLieuNgay } from "../ngayDangXem";
import "./NutCham.state";
import "./LichTuan.state";

/**
 * CHỈ hiện phương thức khi biết chắc. `phuongThuc` là optional, và bản ghi
 * do HR nhập bù không có phương thức nào cả — rơi vào nhánh mặc định sẽ đẻ
 * ra dòng "🔳 QR · HR nhập", tự mâu thuẫn ngay trong một dòng. Thà không
 * nói gì còn hơn bịa ra một cách chấm mà người dùng sẽ tin.
 */
const NHAN_PHUONG_THUC: Record<string, { icon: ReactNode; nhan: string }> = {
  gps: { icon: <AimOutlined />, nhan: "GPS" },
  wifi: { icon: <WifiOutlined />, nhan: "Wifi" },
  qr: { icon: <QrcodeOutlined />, nhan: "QR" },
};

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
  const [ngayDangXem] = useChamCongCuaToiState("ngayDangXem", homNayVN());
  const [banGhiTuan] = useChamCongCuaToiState("banGhiTuan", [] as AttendanceRecord[]);
  if (!homNay) return null;

  // Khối chi tiết đi theo NGÀY ĐANG XEM; hôm nay lấy từ `homNay` (tươi nhất
  // — xem duLieuNgay()), ngày khác lấy từ `banGhiTuan`.
  const dl = duLieuNgay(ngayDangXem, homNayVN(), homNay, banGhiTuan);

  const caQuaDemTuHomTruoc = dl.laHomNay && homNay.ngayCong !== homNay.ngay;
  const tieuDe = caQuaDemTuHomTruoc
    ? `Chi tiết ca ngày ${homNay.ngayCong} (chưa kết thúc)`
    : dl.laHomNay
      ? "Chi tiết chấm công"
      : `Chi tiết ngày ${ngayDangXem}`;

  return (
    <details className="emp-card mt-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13px] font-semibold text-[color:var(--emp-text-phu)]">
        <HistoryOutlined className="text-[color:var(--emp-accent)]" />
        {tieuDe}
      </summary>
      {!dl.laHomNay && (
        // Nút chấm công luôn của hôm nay bất kể đang xem ngày nào — nhắc rõ
        // để người dùng không tưởng nhầm mình sắp chấm công cho ngày này.
        <div className="px-4 pb-2 text-[12px] text-[color:var(--emp-muted)]">
          Đang xem ngày khác — nút chấm công vẫn của hôm nay.
        </div>
      )}
      <div className="px-4 pb-3.5">
        {dl.banGhi.length === 0 ? (
          <div className="py-4 text-center text-[13px] text-[color:var(--emp-muted)]">
            Chưa có lượt chấm công nào
          </div>
        ) : (
          dl.banGhi.map((b) => (
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
                  <div className="text-[15px] font-semibold">{gioGiayVN(b.thoiDiem)}</div>
                  <div className="mt-0.5 text-[11px] text-[color:var(--emp-muted)]">{b.ngay}</div>
                  {/* Có nhiều lượt vào/ra trong ngày thì muộn/sớm phải gắn
                      đúng vào lượt gây ra nó — ô ba trạng thái chỉ nói được
                      về lượt đầu/cuối, không thay được dòng này. */}
                  {b.loai === "vao" && b.soPhutDiMuon > 0 && (
                    <div
                      className="mt-0.5 text-[11px] font-medium"
                      style={{ color: "var(--emp-danger)" }}
                    >
                      Muộn {b.soPhutDiMuon} phút
                    </div>
                  )}
                  {b.loai === "ra" && b.soPhutVeSom > 0 && (
                    <div
                      className="mt-0.5 text-[11px] font-medium"
                      style={{ color: "var(--emp-danger)" }}
                    >
                      Sớm {b.soPhutVeSom} phút
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right text-xs">
                <div>{b.locationTen ?? "—"}</div>
                <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-[color:var(--emp-muted)]">
                  {/* Ngoài vùng KHÔNG phải lỗi: bản ghi đã vào sổ, HR sẽ xem
                      xét. Hiện như lỗi thì người dùng bấm lại và đẻ ra rác. */}
                  {(
                    [
                      b.phuongThuc && NHAN_PHUONG_THUC[b.phuongThuc] ? (
                        <span key="pt" className="inline-flex items-center gap-1">
                          {NHAN_PHUONG_THUC[b.phuongThuc].icon}
                          {NHAN_PHUONG_THUC[b.phuongThuc].nhan}
                        </span>
                      ) : null,
                      b.ngoaiVung ? <span key="nv">ngoài vùng</span> : null,
                      b.nguonTao === "hr_nhap" ? <span key="hr">HR nhập</span> : null,
                    ] as (ReactNode | null)[]
                  )
                    .filter(Boolean)
                    .map((node, i) => (
                      <span key={i} className="inline-flex items-center gap-1">
                        {i > 0 && <span aria-hidden>·</span>}
                        {node}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </details>
  );
}
