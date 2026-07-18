import { useMemo } from "react";
import { Empty, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import {
  useBangCongHandler,
  useBangCongState,
} from "../../BangCongHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import {
  KyHieuDef,
  Timesheet,
  UpdateTimesheetDto,
} from "@/services/timesheetService";
import { WEEKDAY_LABELS, isWeekendDay } from "../../constants";
import { DayCell } from "./DayCell";
import { RowNoteEditor } from "./RowNoteEditor";
import "./BangCongTable.state";

export function BangCongTable() {
  const handler = useBangCongHandler();
  const [thang] = useBangCongState("thang", dayjs().format("YYYY-MM"));
  const [timesheetList] = useBangCongState("timesheetList", [] as Timesheet[]);
  const [kyHieuList] = useBangCongState("kyHieuList", [] as KyHieuDef[]);
  const [loading] = useBangCongState("loading", false);
  const { canEdit } = usePagePermission("/cham-cong/bang-cong");

  const daysInMonth = useMemo(
    () => dayjs(thang, "YYYY-MM").daysInMonth(),
    [thang]
  );

  const handleSetDay = (id: string, ngay: number, kyHieu: string) => {
    handler.executeEvent("setDay", { id, ngay, kyHieu });
  };

  const handleUpdate = (id: string, dto: UpdateTimesheetDto) => {
    handler.executeEvent("updateRow", { id, dto });
  };

  const columns: ColumnsType<Timesheet> = useMemo(() => {
    const fixedLeft: ColumnsType<Timesheet> = [
      {
        title: "STT",
        key: "stt",
        width: 50,
        fixed: "left",
        align: "center",
        render: (_: unknown, __: Timesheet, index: number) => index + 1,
      },
      {
        title: "Mã NV",
        dataIndex: "employeeCode",
        key: "employeeCode",
        width: 100,
        fixed: "left",
        render: (value?: string) => value || "-",
      },
      {
        title: "Họ tên",
        dataIndex: "employeeName",
        key: "employeeName",
        width: 180,
        fixed: "left",
        render: (value?: string) => value || "-",
      },
    ];

    const dayColumns: ColumnsType<Timesheet> = Array.from(
      { length: daysInMonth },
      (_, i) => i + 1
    ).map((day) => {
      const dow = dayjs(thang, "YYYY-MM").date(day).day();
      const weekend = isWeekendDay(dow);
      return {
        title: (
          <div style={{ lineHeight: 1.1 }}>
            <div>{day}</div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 400,
                color: weekend ? "#cf1322" : undefined,
              }}
            >
              {WEEKDAY_LABELS[dow]}
            </div>
          </div>
        ),
        key: `ngay-${day}`,
        width: 46,
        align: "center" as const,
        onHeaderCell: () => ({
          style: weekend ? { background: "#fff1f0" } : undefined,
        }),
        onCell: () => ({
          style: weekend ? { background: "#fff9f8" } : undefined,
        }),
        render: (_: unknown, record: Timesheet) => {
          const entry = record.chiTietNgay?.find((c) => c.ngay === day);
          return (
            <DayCell
              day={day}
              kyHieu={entry?.kyHieu}
              kyHieuOptions={kyHieuList}
              isWeekend={weekend}
              disabled={!canEdit || record.trangThai === "chot"}
              onChange={(kyHieu) => handleSetDay(record._id, day, kyHieu)}
            />
          );
        },
      };
    });

    const fixedRight: ColumnsType<Timesheet> = [
      {
        title: "Tổng công",
        dataIndex: "soNgayCong",
        key: "soNgayCong",
        width: 90,
        fixed: "right",
        align: "center",
        render: (value?: number) => value ?? 0,
      },
      {
        title: "Phép",
        dataIndex: "soNgayNghiPhep",
        key: "soNgayNghiPhep",
        width: 70,
        fixed: "right",
        align: "center",
        render: (value?: number) => value ?? 0,
      },
      {
        title: "Ốm",
        dataIndex: "soNgayOm",
        key: "soNgayOm",
        width: 70,
        fixed: "right",
        align: "center",
        render: (value?: number) => value ?? 0,
      },
      {
        title: "Không lương",
        dataIndex: "soNgayNghiKhongLuong",
        key: "soNgayNghiKhongLuong",
        width: 100,
        fixed: "right",
        align: "center",
        render: (value?: number) => value ?? 0,
      },
      {
        title: "Giờ OT",
        dataIndex: "soGioLamThem",
        key: "soGioLamThem",
        width: 80,
        fixed: "right",
        align: "center",
        render: (value?: number) => value ?? 0,
      },
      {
        title: "",
        key: "actions",
        width: 50,
        fixed: "right",
        align: "center",
        render: (_: unknown, record: Timesheet) => (
          <RowNoteEditor
            record={record}
            disabled={!canEdit || record.trangThai === "chot"}
            onSave={(dto) => handleUpdate(record._id, dto)}
          />
        ),
      },
    ];

    return [...fixedLeft, ...dayColumns, ...fixedRight];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysInMonth, thang, kyHieuList, canEdit]);

  return (
    <div style={{ overflowX: "auto" }}>
      <Table<Timesheet>
        columns={columns}
        dataSource={timesheetList}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 20 }}
        bordered
        size="small"
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
    </div>
  );
}
