import { useMemo } from "react";
import { Empty, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import {
  useBangCongHandler,
  useBangCongState,
} from "../../BangCongHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { BangDuLieu } from "@/components/table/BangDuLieu";
import {
  KyHieuDef,
  Timesheet,
  UpdateTimesheetDto,
} from "@/services/timesheetService";
import { MAU_CUOI_TUAN, WEEKDAY_LABELS, isWeekendDay } from "../../constants";
import { DayCell } from "./DayCell";
import { RowNoteEditor } from "./RowNoteEditor";
import "./BangCongTable.state";

const { Text } = Typography;

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

  const handleSetDay = (
    id: string,
    ngay: number,
    kyHieu: string,
    veTuDong?: boolean
  ) => {
    handler.executeEvent("setDay", { id, ngay, kyHieu, veTuDong });
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
        render: (value?: string) =>
          value ? (
            <Text strong className="text-primary">
              {value}
            </Text>
          ) : (
            "-"
          ),
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
                color: weekend ? MAU_CUOI_TUAN : undefined,
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
          style: weekend ? { background: "hsl(var(--red) / 0.08)" } : undefined,
        }),
        onCell: () => ({
          style: weekend ? { background: "hsl(var(--red) / 0.04)" } : undefined,
        }),
        render: (_: unknown, record: Timesheet) => {
          const entry = record.chiTietNgay?.find((c) => c.ngay === day);
          return (
            <DayCell
              day={day}
              kyHieu={entry?.kyHieu}
              nguon={entry?.nguon}
              canhBao={entry?.canhBao}
              kyHieuOptions={kyHieuList}
              isWeekend={weekend}
              disabled={!canEdit || record.trangThai === "chot"}
              onChange={(kyHieu, veTuDong) =>
                handleSetDay(record._id, day, kyHieu, veTuDong)
              }
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
        width: 100,
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
        // Đã nằm trong "Tổng công" — cột này chỉ trả lời "trong đó bao nhiêu
        // ngày làm ở nhà", vì ngày online không được tính tiền ăn ca.
        title: "Online",
        dataIndex: "soNgayCongOnline",
        key: "soNgayCongOnline",
        width: 80,
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
        width: 120,
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
    <BangDuLieu<Timesheet>
      columns={columns}
      dataSource={timesheetList}
      rowKey="_id"
      loading={loading}
      // Lưới ngày công cần kẻ ô như bảng chấm công giấy.
      bordered
      // Header hai tầng (ngày + thứ) và dòng chú thích ký hiệu dưới bảng
      // chiếm thêm chỗ so với bảng danh mục thường.
      buTruDoc={330}
      pagination={{
        defaultPageSize: 50,
        showSizeChanger: true,
        pageSizeOptions: ["25", "50", "100", "200"],
        showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} nhân viên`,
      }}
      locale={{
        // Lúc đang tải BangDuLieu tự để trống ô này — không cần tự nhánh.
        emptyText: (
          <Empty description="Bấm 'Tổng hợp bảng công' để sinh bảng công tháng này" />
        ),
      }}
    />
  );
}
