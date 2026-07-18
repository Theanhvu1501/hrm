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
    </div>
  );
}
