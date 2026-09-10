import { useBangCongState } from "../../BangCongHandlerContext";
import { KyHieuDef } from "@/services/timesheetService";
import { NEN_O_CANH_BAO, VIEN_O_HR_SUA } from "../../constants";
import "../table/BangCongTable.state";

export function BangCongLegend() {
  const [kyHieuList] = useBangCongState("kyHieuList", [] as KyHieuDef[]);

  if (kyHieuList.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[hsl(var(--ink-2))]">
      <span className="font-semibold text-[hsl(var(--ink))]">Ký hiệu:</span>
      {kyHieuList.map((k) => (
        <span key={k.kyHieu}>
          <strong className="text-[hsl(var(--ink))]">{k.kyHieu}</strong> {k.nhan} ({k.soCong} công)
        </span>
      ))}
      {/* Màu/viền của ô trong lưới không tự giải thích — phải chú giải riêng.
          Dùng CHUNG hằng số với DayCell.tsx (cellStyle) để chú giải không lệch
          với ô thật trên lưới. */}
      <span className="inline-flex items-center gap-1">
        <span style={{ border: VIEN_O_HR_SUA, padding: "0 5px" }}>X</span>
        HR sửa tay — máy sẽ không tự động ghi đè ô này nữa
      </span>
      <span className="inline-flex items-center gap-1">
        <span style={{ background: NEN_O_CANH_BAO, padding: "0 5px" }}>X</span>
        Có cảnh báo — di chuột để xem
      </span>
    </div>
  );
}
