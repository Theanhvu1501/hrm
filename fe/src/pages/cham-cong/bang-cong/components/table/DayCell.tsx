import { useState } from "react";
import { Button, Popover, Space } from "antd";
import { KyHieuDef } from "@/services/timesheetService";

interface DayCellProps {
  day: number;
  kyHieu?: string;
  kyHieuOptions: KyHieuDef[];
  disabled: boolean;
  isWeekend: boolean;
  onChange: (kyHieu: string) => void;
}

export function DayCell({
  kyHieu,
  kyHieuOptions,
  disabled,
  isWeekend,
  onChange,
}: DayCellProps) {
  const [open, setOpen] = useState(false);

  const cellStyle: React.CSSProperties = {
    minHeight: 24,
    fontWeight: kyHieu ? 600 : 400,
    color: isWeekend ? "#cf1322" : undefined,
    cursor: disabled ? "default" : "pointer",
  };

  if (disabled) {
    return <div style={cellStyle}>{kyHieu || ""}</div>;
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
          <Button size="small" block danger onClick={() => handlePick("")}>
            Xoá ký hiệu
          </Button>
        </Space>
      }
    >
      <div style={cellStyle}>{kyHieu || <span style={{ color: "#bfbfbf" }}>·</span>}</div>
    </Popover>
  );
}
