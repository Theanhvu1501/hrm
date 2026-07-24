import { useState } from "react";
import { Button, InputNumber, Popover, Space } from "antd";
import { EditOutlined } from "@ant-design/icons";

interface OSuaBienDongProps {
  /** Nhãn hiển thị trên tiêu đề Popover, vd: "Hiệu suất", "Tạm ứng". */
  label: string;
  /** Giá trị hiện tại (đơn vị tiền, VNĐ). */
  value: number;
  disabled: boolean;
  onSave: (value: number) => void;
}

function formatTien(value: number): string {
  return value.toLocaleString("vi-VN");
}

/**
 * Ô sửa tại chỗ cho các khoản biến động (nhập theo kỳ / tạm ứng / khấu trừ
 * khác) trên bảng lương. Khuôn theo `RowNoteEditor` của bang-cong: Popover +
 * state cục bộ + nút Lưu bắn `onSave`. Khi `disabled` (kỳ đã chốt) chỉ hiện
 * số, không cho bấm sửa.
 */
export function OSuaBienDong({ label, value, disabled, onSave }: OSuaBienDongProps) {
  const [open, setOpen] = useState(false);
  const [nhap, setNhap] = useState(value);

  const cellStyle: React.CSSProperties = {
    fontVariantNumeric: "tabular-nums",
    textAlign: "right",
  };

  if (disabled) {
    return <div style={cellStyle}>{formatTien(value)}</div>;
  }

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setNhap(value);
    }
    setOpen(next);
  };

  const handleSave = () => {
    onSave(nhap);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      trigger="click"
      title={label}
      content={
        <Space direction="vertical" style={{ width: 200 }}>
          <InputNumber
            min={0}
            style={{ width: "100%" }}
            value={nhap}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(v) => v?.replace(/,/g, "") as unknown as number}
            onChange={(v) => setNhap(typeof v === "number" ? v : 0)}
          />
          <Button type="primary" size="small" block onClick={handleSave}>
            Lưu
          </Button>
        </Space>
      }
    >
      <div style={{ ...cellStyle, cursor: "pointer" }}>
        {formatTien(value)}
        <EditOutlined style={{ marginLeft: 6, color: "#8c8c8c", fontSize: 11 }} />
      </div>
    </Popover>
  );
}
