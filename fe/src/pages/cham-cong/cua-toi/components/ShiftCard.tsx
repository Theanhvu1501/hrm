import { useState } from "react";
import { useChamCongCuaToiState } from "../ChamCongCuaToiHandlerContext";
import { TrangThaiHomNay } from "@/services/attendanceRecordService";
import "./NutCham.state";

/**
 * Ca hôm nay và các địa điểm được phép chấm.
 *
 * Bản mockup vẽ "📍 Văn phòng HN · Bán kính 100m", ngụ ý mỗi nhân viên được
 * gán MỘT địa điểm. Model không có quan hệ đó: Employee không có locationId,
 * và backend khớp GPS/wifi/QR với TOÀN BỘ địa điểm đang bật khi chấm. Nên ở
 * đây hiện đúng cái đang có — tên điểm khi công ty chỉ có một, số lượng khi
 * có nhiều. Lấy đại điểm đầu danh sách sẽ hiện sai bán kính cho người làm
 * nhiều chi nhánh, và họ sẽ tin vào con số đó.
 */
export function ShiftCard() {
  const [homNay] = useChamCongCuaToiState("homNay", null as TrangThaiHomNay | null);
  const [moDanhSach, setMoDanhSach] = useState(false);

  if (!homNay) return null;

  const diaDiem = homNay.diaDiem ?? [];
  const motDiem = diaDiem.length === 1 ? diaDiem[0] : null;

  return (
    <div className="emp-card mb-4 flex items-center justify-between px-4 py-3.5">
      <div>
        {homNay.ca ? (
          <>
            <div className="text-[15px] font-semibold">{homNay.ca.ten}</div>
            <div className="mt-0.5 text-[13px] text-[color:var(--emp-text-phu)]">
              ⏰ {homNay.ca.gioBatDau} – {homNay.ca.gioKetThuc}
              {homNay.ca.laCaQuaDem && " (qua đêm)"}
            </div>
          </>
        ) : (
          <>
            <div className="text-[15px] font-semibold">Chưa gán ca</div>
            <div className="mt-0.5 text-[13px] text-[color:var(--emp-text-phu)]">
              Hệ thống sẽ không tính đi muộn / về sớm
            </div>
          </>
        )}
      </div>

      {diaDiem.length > 0 && (
        <div className="text-right text-[11px] text-[color:var(--emp-muted)]">
          {motDiem ? (
            <>
              <div>📍 {motDiem.ten}</div>
              {motDiem.banKinh !== undefined && <div>Bán kính {motDiem.banKinh}m</div>}
            </>
          ) : (
            <button
              type="button"
              className="text-[11px] text-[color:var(--emp-muted)] underline"
              onClick={() => setMoDanhSach((v) => !v)}
            >
              📍 {diaDiem.length} địa điểm được phép
            </button>
          )}
          {moDanhSach &&
            diaDiem.map((d) => (
              <div key={d.id}>
                {d.ten}
                {d.banKinh !== undefined ? ` · ${d.banKinh}m` : ""}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
