import { Space, Tag } from "antd";
import { useBangCongState } from "../../BangCongHandlerContext";
import { KyHieuDef } from "@/services/timesheetService";
import "../table/BangCongTable.state";

export function BangCongLegend() {
  const [kyHieuList] = useBangCongState("kyHieuList", [] as KyHieuDef[]);

  if (kyHieuList.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border border-border p-3">
      <div className="mb-2 text-sm font-medium text-foreground">
        Chú thích ký hiệu
      </div>
      <Space wrap size={[8, 8]}>
        {kyHieuList.map((k) => (
          <Tag key={k.kyHieu} color="blue">
            <strong>{k.kyHieu}</strong> — {k.nhan} ({k.soCong} công)
          </Tag>
        ))}
      </Space>
      {/* Màu/viền của ô trong lưới không tự giải thích — phải chú giải riêng.
          Giá trị màu khớp NGUYÊN VĂN với DayCell.tsx (cellStyle) để chú giải
          không lệch với ô thật trên lưới. */}
      <Space size={16} className="mt-2">
        <span>
          <span style={{ border: "1px solid #1677ff", padding: "0 6px" }}>X</span>{" "}
          HR sửa tay — máy sẽ không tự động ghi đè ô này nữa
        </span>
        <span>
          <span style={{ background: "#fff7e6", padding: "0 6px" }}>X</span>{" "}
          Có cảnh báo — di chuột để xem
        </span>
      </Space>
    </div>
  );
}
