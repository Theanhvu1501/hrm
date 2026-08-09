import { useMemo, useState } from "react";
import { Table, Tag, Button, Space, Popconfirm, Input, Select } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  useHoSoNhanVienHandler,
  useHoSoNhanVienState,
} from "../../HoSoNhanVienHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { usePhongBanOptions } from "@/hooks/usePhongBanOptions";
import { Employee } from "@/services/employeeService";
import {
  LOAI_HOP_DONG_OPTIONS,
  TRANG_THAI_OPTIONS,
  TRANG_THAI_TAG_COLOR,
  labelFor,
} from "../../constants";
import "./HoSoNhanVienTable.state";

export function HoSoNhanVienTable() {
  const handler = useHoSoNhanVienHandler();
  const [employeeList] = useHoSoNhanVienState("employeeList", [] as Employee[]);
  const [loading] = useHoSoNhanVienState("loading", false);
  const { canCreate, canEdit, canDelete } = usePagePermission(
    "/nhan-su/ho-so-nhan-vien"
  );
  const { tenTheoId } = usePhongBanOptions();

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const handleAdd = () => {
    handler.executeEvent("openForm", {});
  };

  const handleEdit = (record: Employee) => {
    handler.executeEvent("openForm", { record });
  };

  const handleDelete = (id: string) => {
    handler.executeEvent("removeEmployee", { id });
  };

  const rows = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return employeeList.filter((item) => {
      const matchesKeyword = keyword
        ? item.hoTen?.toLowerCase().includes(keyword)
        : true;
      const matchesStatus = statusFilter ? item.trangThai === statusFilter : true;
      return matchesKeyword && matchesStatus;
    });
  }, [employeeList, searchText, statusFilter]);

  const columns: ColumnsType<Employee> = [
    {
      title: "Mã NV",
      dataIndex: "employeeId",
      key: "employeeId",
      width: 120,
    },
    {
      title: "Họ tên",
      dataIndex: "hoTen",
      key: "hoTen",
    },
    {
      title: "Phòng ban",
      dataIndex: "departmentId",
      key: "departmentId",
      width: 160,
      render: (id?: string | null) => tenTheoId(id),
    },
    {
      title: "Chức danh",
      dataIndex: "chucDanh",
      key: "chucDanh",
      width: 160,
    },
    {
      title: "Loại hợp đồng",
      dataIndex: "loaiHopDong",
      key: "loaiHopDong",
      width: 140,
      align: "center",
      render: (value: string) => labelFor(LOAI_HOP_DONG_OPTIONS, value),
    },
    {
      title: "Trạng thái",
      dataIndex: "trangThai",
      key: "trangThai",
      width: 150,
      align: "center",
      render: (value: string) => (
        <Tag color={TRANG_THAI_TAG_COLOR[value] || "default"}>
          {labelFor(TRANG_THAI_OPTIONS, value)}
        </Tag>
      ),
    },
    {
      title: "Hành động",
      key: "action",
      width: 120,
      align: "center",
      render: (_: unknown, record: Employee) => (
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
              title="Bạn có chắc muốn xoá hồ sơ nhân viên này?"
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
          <h1 className="text-2xl font-bold text-foreground">Hồ sơ nhân viên</h1>
          <p className="text-muted-foreground">
            Quản lý hồ sơ, thông tin cá nhân và công việc của nhân viên
          </p>
        </div>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Thêm nhân viên
          </Button>
        )}
      </div>

      <Space wrap>
        <Input.Search
          allowClear
          placeholder="Tìm theo họ tên"
          style={{ width: 260 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
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

      <Table<Employee>
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
