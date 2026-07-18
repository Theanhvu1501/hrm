import { useState } from "react";
import { Button, Input, InputNumber, Popover, Space } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { Timesheet, UpdateTimesheetDto } from "@/services/timesheetService";

interface RowNoteEditorProps {
  record: Timesheet;
  disabled: boolean;
  onSave: (dto: UpdateTimesheetDto) => void;
}

export function RowNoteEditor({ record, disabled, onSave }: RowNoteEditorProps) {
  const [open, setOpen] = useState(false);
  const [soLanDiMuon, setSoLanDiMuon] = useState(record.soLanDiMuon ?? 0);
  const [soLanVeSom, setSoLanVeSom] = useState(record.soLanVeSom ?? 0);
  const [ghiChu, setGhiChu] = useState(record.ghiChu ?? "");

  if (disabled) {
    return null;
  }

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setSoLanDiMuon(record.soLanDiMuon ?? 0);
      setSoLanVeSom(record.soLanVeSom ?? 0);
      setGhiChu(record.ghiChu ?? "");
    }
    setOpen(next);
  };

  const handleSave = () => {
    onSave({ soLanDiMuon, soLanVeSom, ghiChu });
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
          <div>
            <span className="text-xs text-muted-foreground">Đi muộn (lần)</span>
            <InputNumber
              min={0}
              value={soLanDiMuon}
              onChange={(v) => setSoLanDiMuon(typeof v === "number" ? v : 0)}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Về sớm (lần)</span>
            <InputNumber
              min={0}
              value={soLanVeSom}
              onChange={(v) => setSoLanVeSom(typeof v === "number" ? v : 0)}
              style={{ width: "100%" }}
            />
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
