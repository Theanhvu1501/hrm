import { useState } from "react";
import { Button, Input, Popover, Space } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { Timesheet, UpdateTimesheetDto } from "@/services/timesheetService";

interface RowNoteEditorProps {
  record: Timesheet;
  disabled: boolean;
  onSave: (dto: UpdateTimesheetDto) => void;
}

export function RowNoteEditor({ record, disabled, onSave }: RowNoteEditorProps) {
  const [open, setOpen] = useState(false);
  const [ghiChu, setGhiChu] = useState(record.ghiChu ?? "");

  if (disabled) {
    return null;
  }

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setGhiChu(record.ghiChu ?? "");
    }
    setOpen(next);
  };

  const handleSave = () => {
    onSave({ ghiChu });
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      trigger="click"
      title="Ghi chú thêm"
      content={
        <Space direction="vertical" style={{ width: 220 }}>
          {/* Đi muộn/về sớm là máy tự tính từ bản ghi chấm công lúc Tổng hợp
              (spec §5.3) — không còn là ô cho HR gõ tay, nên chỉ hiện SỐ,
              không có InputNumber. Gõ tay ở đây trước bản vá này sống sót đến
              lần Tổng hợp kế tiếp rồi bị máy ghi đè không một cảnh báo nào. */}
          <div>
            <span className="text-xs text-muted-foreground">Đi muộn (lần)</span>
            <div>{record.soLanDiMuon ?? 0}</div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Về sớm (lần)</span>
            <div>{record.soLanVeSom ?? 0}</div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Ghi chú</span>
            <Input
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              placeholder="Ghi chú"
            />
          </div>
          <Button type="primary" size="small" block onClick={handleSave}>
            Lưu
          </Button>
        </Space>
      }
    >
      <Button size="small" type="text" icon={<EditOutlined />} />
    </Popover>
  );
}
