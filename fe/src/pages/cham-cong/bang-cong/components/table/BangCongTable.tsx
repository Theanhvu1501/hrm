import { useEffect, useState } from "react";
import { Empty, Input, InputNumber, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  useBangCongHandler,
  useBangCongState,
} from "../../BangCongHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { Timesheet, UpdateTimesheetDto } from "@/services/timesheetService";
import { TRANG_THAI_OPTIONS, TRANG_THAI_TAG_COLOR, labelFor } from "../../constants";
import "./BangCongTable.state";

interface EditableNumberCellProps {
  value: number;
  disabled: boolean;
  onSave: (value: number) => void;
}

function EditableNumberCell({ value, disabled, onSave }: EditableNumberCellProps) {
  const [current, setCurrent] = useState(value);

  useEffect(() => {
    setCurrent(value);
  }, [value]);

  if (disabled) {
    return <span>{value ?? 0}</span>;
  }

  return (
    <InputNumber
      min={0}
      value={current}
      onChange={(v) => setCurrent(typeof v === "number" ? v : 0)}
      onBlur={() => {
        if (current !== value) onSave(current);
      }}
      style={{ width: 100 }}
    />
  );
}

interface EditableTextCellProps {
  value?: string;
  disabled: boolean;
  onSave: (value: string) => void;
}

function EditableTextCell({ value, disabled, onSave }: EditableTextCellProps) {
  const [current, setCurrent] = useState(value || "");

  useEffect(() => {
    setCurrent(value || "");
  }, [value]);

  if (disabled) {
    return <span>{value || "-"}</span>;
  }

  return (
    <Input
      value={current}
      onChange={(e) => setCurrent(e.target.value)}
      onBlur={() => {
        if (current !== (value || "")) onSave(current);
      }}
      placeholder="Ghi chú"
    />
  );
}

export function BangCongTable() {
  const handler = useBangCongHandler();
  const [timesheetList] = useBangCongState("timesheetList", [] as Timesheet[]);
  const [loading] = useBangCongState("loading", false);
  const { canEdit } = usePagePermission("/cham-cong/bang-cong");

  const handleUpdate = (id: string, dto: UpdateTimesheetDto) => {
    handler.executeEvent("updateRow", { id, dto });
  };

  const columns: ColumnsType<Timesheet> = [
    {
      title: "Mã NV",
      dataIndex: "employeeCode",
      key: "employeeCode",
      width: 120,
      render: (value?: string) => value || "-",
    },
    {
      title: "Nhân viên",
      dataIndex: "employeeName",
      key: "employeeName",
      render: (value?: string) => value || "-",
    },
    {
      title: "Số ngày công",
      key: "soNgayCong",
      width: 130,
      align: "center",
      render: (_: unknown, record: Timesheet) => (
        <EditableNumberCell
          value={record.soNgayCong ?? 0}
          disabled={!canEdit || record.trangThai === "chot"}
          onSave={(v) => handleUpdate(record._id, { soNgayCong: v })}
        />
      ),
    },
    {
      title: "Giờ làm thêm",
      key: "soGioLamThem",
      width: 130,
      align: "center",
      render: (_: unknown, record: Timesheet) => (
        <EditableNumberCell
          value={record.soGioLamThem ?? 0}
          disabled={!canEdit || record.trangThai === "chot"}
          onSave={(v) => handleUpdate(record._id, { soGioLamThem: v })}
        />
      ),
    },
    {
      title: "Đi muộn (lần)",
      key: "soLanDiMuon",
      width: 130,
      align: "center",
      render: (_: unknown, record: Timesheet) => (
        <EditableNumberCell
          value={record.soLanDiMuon ?? 0}
          disabled={!canEdit || record.trangThai === "chot"}
          onSave={(v) => handleUpdate(record._id, { soLanDiMuon: v })}
        />
      ),
    },
    {
      title: "Về sớm (lần)",
      key: "soLanVeSom",
      width: 130,
      align: "center",
      render: (_: unknown, record: Timesheet) => (
        <EditableNumberCell
          value={record.soLanVeSom ?? 0}
          disabled={!canEdit || record.trangThai === "chot"}
          onSave={(v) => handleUpdate(record._id, { soLanVeSom: v })}
        />
      ),
    },
    {
      title: "Ghi chú",
      key: "ghiChu",
      render: (_: unknown, record: Timesheet) => (
        <EditableTextCell
          value={record.ghiChu}
          disabled={!canEdit || record.trangThai === "chot"}
          onSave={(v) => handleUpdate(record._id, { ghiChu: v })}
        />
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "trangThai",
      key: "trangThai",
      width: 110,
      align: "center",
      render: (value: string) => (
        <Tag color={TRANG_THAI_TAG_COLOR[value] || "default"}>
          {labelFor(TRANG_THAI_OPTIONS, value)}
        </Tag>
      ),
    },
  ];

  return (
    <Table<Timesheet>
      columns={columns}
      dataSource={timesheetList}
      rowKey="_id"
      loading={loading}
      pagination={{ pageSize: 20 }}
      bordered
      scroll={{ x: "max-content" }}
      locale={{
        emptyText: (
          <Empty
            description={
              !loading
                ? "Bấm 'Tạo/Cập nhật bảng công' để sinh bảng công tháng này"
                : " "
            }
          />
        ),
      }}
    />
  );
}
