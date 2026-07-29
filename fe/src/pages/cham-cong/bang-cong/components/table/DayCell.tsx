import { useState } from "react";
import { Button, Popover, Space, Tooltip } from "antd";
import { KyHieuDef } from "@/services/timesheetService";
import { moTaCanhBao } from "../../nhanCanhBao";

interface DayCellProps {
  day: number;
  kyHieu?: string;
  nguon?: string;
  canhBao?: string[];
  kyHieuOptions: KyHieuDef[];
  disabled: boolean;
  isWeekend: boolean;
  onChange: (kyHieu: string, veTuDong?: boolean) => void;
}

export function DayCell({
  kyHieu,
  nguon,
  canhBao,
  kyHieuOptions,
  disabled,
  isWeekend,
  onChange,
}: DayCellProps) {
  const [open, setOpen] = useState(false);
  const laHrSua = nguon === "hr_sua";
  const coCanhBao = !!canhBao?.length;

  const cellStyle: React.CSSProperties = {
    minHeight: 24,
    fontWeight: kyHieu ? 600 : 400,
    color: isWeekend ? "#cf1322" : undefined,
    cursor: disabled ? "default" : "pointer",
    // Viền xanh = người đã chạm vào ô này, máy sẽ không đụng nữa.
    border: laHrSua ? "1px solid #1677ff" : "1px solid transparent",
    // Nền vàng = có chuyện cần HR nhìn trước khi chốt.
    background: coCanhBao ? "#fff7e6" : undefined,
  };

  const boc = (noiDung: React.ReactNode) =>
    coCanhBao ? <Tooltip title={moTaCanhBao(canhBao)}>{noiDung}</Tooltip> : noiDung;

  if (disabled) {
    return boc(<div style={cellStyle}>{kyHieu || ""}</div>);
  }

  const handlePick = (value: string) => {
    onChange(value);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      content={
        <Space direction="vertical" size={4}>
          {kyHieuOptions.map((opt) => (
            <Button
              key={opt.kyHieu}
              size="small"
              block
              type={kyHieu === opt.kyHieu ? "primary" : "default"}
              onClick={() => handlePick(opt.kyHieu)}
            >
              {opt.kyHieu} - {opt.nhan}
            </Button>
          ))}
          {laHrSua && (
            <Button
              size="small"
              block
              onClick={() => {
                onChange("", true);
                setOpen(false);
              }}
            >
              Trả về tự động
            </Button>
          )}
          <Button size="small" block danger onClick={() => handlePick("")}>
            Xoá ký hiệu
          </Button>
        </Space>
      }
    >
      {boc(<div style={cellStyle}>{kyHieu || <span style={{ color: "#bfbfbf" }}>·</span>}</div>)}
    </Popover>
  );
}
