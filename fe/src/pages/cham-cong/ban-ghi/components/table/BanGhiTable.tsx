import { useMemo } from "react";
import { Table, Button, Tag, Select, DatePicker, Checkbox, Space, Tooltip } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useBanGhiHandler, useBanGhiState } from "../../BanGhiHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import {
  AttendanceRecord,
  AttendanceRecordFilter,
} from "@/services/attendanceRecordService";
import { Employee } from "@/services/employeeService";
import { gioVN, DINH_DANG_NGAY } from "@/ultils/thoiGianVN";
import "./BanGhiTable.state";

export function BanGhiTable() {
  const handler = useBanGhiHandler();
  const [recordList] = useBanGhiState("recordList", [] as AttendanceRecord[]);
  const [employeeList] = useBanGhiState("employeeList", [] as Employee[]);
  const [filter] = useBanGhiState("filter", {} as AttendanceRecordFilter);
  const [loading] = useBanGhiState("loading", false);
  const { canCreate } = usePagePermission("/cham-cong/ban-ghi");

  const employeeOptions = useMemo(
    () =>
      employeeList.map((e) => ({
        value: e.id,
        label: `${e.hoTen} (${e.employeeId})`,
      })),
    [employeeList]
  );

  const timKiem = (patch: Partial<AttendanceRecordFilter>) => {
    handler.executeEvent("timKiem", { ...filter, ...patch });
  };

  const columns: ColumnsType<AttendanceRecord> = [
    { title: "Ngày", dataIndex: "ngay", key: "ngay", width: 110 },
    {
      title: "Nhân viên",
      key: "nhanVien",
      render: (_: unknown, r: AttendanceRecord) =>
        `${r.employeeName ?? ""} (${r.employeeCode ?? ""})`,
    },
    {
      title: "Vào/Ra",
      dataIndex: "loai",
      key: "loai",
      width: 90,
      render: (v: string) =>
        v === "vao" ? <Tag color="green">Vào</Tag> : <Tag color="blue">Ra</Tag>,
    },
    { title: "Giờ", dataIndex: "thoiDiem", key: "thoiDiem", width: 80, render: gioVN },
    {
      title: "Ca",
      dataIndex: "caTen",
      key: "caTen",
      width: 130,
      render: (v?: string) => v || <span className="text-muted-foreground">—</span>,
    },
    {
      title: "Địa điểm",
      key: "diaDiem",
      render: (_: unknown, r: AttendanceRecord) => (
        <div>
          <div>
            {r.locationTen ?? (
              <span className="text-muted-foreground">Không khớp địa điểm</span>
            )}
          </div>
          {r.latitude !== undefined && r.longitude !== undefined && (
            <div className="text-xs text-muted-foreground">
              {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
              {r.khoangCachMet !== undefined && ` — cách ${r.khoangCachMet}m`}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Muộn/Sớm",
      key: "muonSom",
      width: 110,
      render: (_: unknown, r: AttendanceRecord) => {
        if (r.loai === "vao" && r.soPhutDiMuon > 0)
          return <Tag color="orange">Muộn {r.soPhutDiMuon}′</Tag>;
        if (r.loai === "ra" && r.soPhutVeSom > 0)
          return <Tag color="orange">Sớm {r.soPhutVeSom}′</Tag>;
        return null;
      },
    },
    {
      title: "Cảnh báo",
      key: "canhBao",
      width: 150,
      // ngoaiVung KHÔNG phải lỗi — bản ghi vẫn hợp lệ, chỉ là HR cần xem
      // xét thêm. Cố ý dùng màu "gold" (cảnh báo nhẹ), không dùng đỏ/"lỗi".
      render: (_: unknown, r: AttendanceRecord) => (
        <Space direction="vertical" size={2}>
          {r.ngoaiVung && <Tag color="gold">Ngoài vùng</Tag>}
          {r.laNgayNghi && <Tag color="purple">Ngày nghỉ</Tag>}
          {r.nguonTao === "hr_nhap" && <Tag>HR nhập bù</Tag>}
        </Space>
      ),
    },
    {
      title: "Ghi chú",
      dataIndex: "ghiChu",
      key: "ghiChu",
      ellipsis: true,
      render: (v?: string) =>
        v ? (
          <Tooltip title={v}>
            <span className="text-xs text-muted-foreground">{v}</span>
          </Tooltip>
        ) : null,
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bản ghi chấm công</h1>
        <p className="text-muted-foreground">
          Tra cứu các lượt chấm công của toàn công ty và nhập bù cho nhân viên quên chấm
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DatePicker.RangePicker
          format={DINH_DANG_NGAY}
          value={
            filter.tuNgay
              ? [
                  dayjs(filter.tuNgay, DINH_DANG_NGAY),
                  dayjs(filter.denNgay ?? filter.tuNgay, DINH_DANG_NGAY),
                ]
              : null
          }
          onChange={(v) =>
            timKiem({
              tuNgay: v?.[0]?.format(DINH_DANG_NGAY),
              denNgay: v?.[1]?.format(DINH_DANG_NGAY),
            })
          }
        />

        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Tất cả nhân viên"
          style={{ width: 260 }}
          options={employeeOptions}
          value={filter.employeeId}
          onChange={(v) => timKiem({ employeeId: v })}
        />

        <Checkbox
          checked={filter.ngoaiVung === true}
          onChange={(e) =>
            timKiem({ ngoaiVung: e.target.checked ? true : undefined })
          }
        >
          Chỉ hiện ngoài vùng
        </Checkbox>

        <div className="ml-auto">
          {canCreate && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handler.executeEvent("openNhapBu", {})}
            >
              Nhập bù
            </Button>
          )}
        </div>
      </div>

      <Table<AttendanceRecord>
        rowKey="id"
        loading={loading}
        dataSource={recordList}
        columns={columns}
        pagination={{ pageSize: 50 }}
        size="small"
        bordered
        scroll={{ x: "max-content" }}
      />
    </div>
  );
}
