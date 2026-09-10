import { useMemo, useState } from "react";
import { Card, Button, Space, Popconfirm, Select, Tooltip } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  useThoiViecHandler,
  useThoiViecState,
} from "../../ThoiViecHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { FilterBar } from "@/components/common/FilterBar";
import { BangDuLieu } from "@/components/table/BangDuLieu";
import { StatusPill } from "@/components/ui/StatusPill";
import { Resignation } from "@/services/resignationService";
import { Employee } from "@/services/employeeService";
import {
  LOAI_THOI_VIEC_OPTIONS,
  TRANG_THAI_OPTIONS,
  TRANG_THAI_TONE,
  labelFor,
} from "../../constants";
import "./ThoiViecTable.state";

export function ThoiViecTable() {
  const handler = useThoiViecHandler();
  const [resignationList] = useThoiViecState("resignationList", [] as Resignation[]);
  const [employeeList] = useThoiViecState("employeeList", [] as Employee[]);
  const [loading] = useThoiViecState("loading", false);
  const { canCreate, canEdit, canDelete } = usePagePermission("/nhan-su/thoi-viec");

  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [employeeFilter, setEmployeeFilter] = useState<string | undefined>(undefined);

  const handleAdd = () => {
    handler.executeEvent("openForm", {});
  };

  const handleEdit = (record: Resignation) => {
    handler.executeEvent("openForm", { record });
  };

  const handleDelete = (id: string) => {
    handler.executeEvent("removeResignation", { id });
  };

  const handleStatusChange = (record: Resignation, trangThai: string) => {
    handler.executeEvent("updateResignationStatus", { id: record.id, trangThai });
  };

  const rows = useMemo(() => {
    return resignationList.filter((item) => {
      const matchesStatus = statusFilter ? item.trangThai === statusFilter : true;
      const matchesEmployee = employeeFilter
        ? item.employeeId === employeeFilter
        : true;
      return matchesStatus && matchesEmployee;
    });
  }, [resignationList, statusFilter, employeeFilter]);

  const employeeOptions = useMemo(
    () =>
      employeeList.map((e) => ({
        value: e.id,
        label: `${e.hoTen} (${e.employeeId})`,
      })),
    [employeeList]
  );

  const columns: ColumnsType<Resignation> = [
    {
      title: "Nhân viên",
      key: "employee",
      render: (_: unknown, record: Resignation) => (
        <div>
          <div>{record.employeeName || "-"}</div>
          {record.employeeCode && (
            <div className="text-xs text-muted-foreground">
              {record.employeeCode}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Ngày nộp đơn",
      dataIndex: "ngayNopDon",
      key: "ngayNopDon",
      width: 130,
      render: (value?: string) => value || "-",
    },
    {
      title: "Ngày làm việc cuối",
      dataIndex: "ngayLamViecCuoi",
      key: "ngayLamViecCuoi",
      width: 150,
      render: (value?: string) => value || "-",
    },
    {
      title: "Loại thôi việc",
      dataIndex: "loaiThoiViec",
      key: "loaiThoiViec",
      width: 160,
      align: "center",
      render: (value: string) => labelFor(LOAI_THOI_VIEC_OPTIONS, value),
    },
    {
      title: (
        <Space size={4}>
          Trạng thái
          <Tooltip title='Chuyển trạng thái sang "Hoàn thành" sẽ tự động chuyển hồ sơ nhân viên sang "Đã nghỉ".'>
            <InfoCircleOutlined className="text-muted-foreground" />
          </Tooltip>
        </Space>
      ),
      key: "trangThai",
      width: 200,
      align: "center",
      render: (_: unknown, record: Resignation) =>
        canEdit ? (
          <Select
            size="small"
            value={record.trangThai}
            style={{ width: 150 }}
            onChange={(value) => handleStatusChange(record, value)}
            options={TRANG_THAI_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
        ) : (
          <StatusPill tone={TRANG_THAI_TONE[record.trangThai] ?? "trung-tinh"}>
            {labelFor(TRANG_THAI_OPTIONS, record.trangThai)}
          </StatusPill>
        ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 90,
      align: "center",
      fixed: "right",
      render: (_: unknown, record: Resignation) => (
        <Space size="small">
          {canEdit && (
            <Tooltip title="Sửa">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                className="text-primary"
              />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm
              title="Xác nhận xóa"
              description="Bạn có chắc chắn muốn xóa đơn thôi việc này?"
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Xóa">
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <FilterBar
        filters={
          <>
            <Select
              allowClear
              showSearch
              placeholder="Lọc theo nhân viên"
              style={{ width: 240 }}
              value={employeeFilter}
              onChange={(value) => setEmployeeFilter(value)}
              options={employeeOptions}
              optionFilterProp="label"
            />
            <Select
              allowClear
              placeholder="Lọc theo trạng thái"
              style={{ width: 200 }}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              options={TRANG_THAI_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </>
        }
        actions={
          canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Tạo đơn thôi việc
            </Button>
          )
        }
      />

      <BangDuLieu<Resignation>
        columns={columns}
        dataSource={rows}
        rowKey="id"
        loading={loading}
        pagination={{
          defaultPageSize: 50,
          showSizeChanger: true,
          pageSizeOptions: ["25", "50", "100", "200"],
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} đơn`,
        }}
      />
    </Card>
  );
}
