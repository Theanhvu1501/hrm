import { useMemo, useState } from "react";
import { Table, Tag, Button, Space, Popconfirm, Select, Tooltip } from "antd";
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
import { Resignation } from "@/services/resignationService";
import { Employee } from "@/services/employeeService";
import {
  LOAI_THOI_VIEC_OPTIONS,
  TRANG_THAI_OPTIONS,
  TRANG_THAI_TAG_COLOR,
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
          <Tag color={TRANG_THAI_TAG_COLOR[record.trangThai] || "default"}>
            {labelFor(TRANG_THAI_OPTIONS, record.trangThai)}
          </Tag>
        ),
    },
    {
      title: "Hành động",
      key: "action",
      width: 120,
      align: "center",
      render: (_: unknown, record: Resignation) => (
        <Space>
          {canEdit && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          )}
          {canDelete && (
            <Popconfirm
              title="Bạn có chắc muốn xoá đơn thôi việc này?"
              onConfirm={() => handleDelete(record.id)}
              okText="Xoá"
              cancelText="Huỷ"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Thôi việc / Bàn giao</h1>
          <p className="text-muted-foreground">
            Quản lý đơn thôi việc và checklist bàn giao của nhân viên
          </p>
        </div>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Tạo đơn thôi việc
          </Button>
        )}
      </div>

      <Space wrap>
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
      </Space>

      <Table<Resignation>
        columns={columns}
        dataSource={rows}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        bordered
        scroll={{ x: "max-content" }}
      />
    </div>
  );
}
