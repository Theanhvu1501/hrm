import { useMemo, useState } from "react";
import { Table, Tag, Button, Space, Popconfirm, Select } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  useQuaTrinhCongTacHandler,
  useQuaTrinhCongTacState,
} from "../../QuaTrinhCongTacHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { EmploymentHistory } from "@/services/employmentHistoryService";
import { Employee } from "@/services/employeeService";
import {
  LOAI_THAY_DOI_OPTIONS,
  TRANG_THAI_MOI_OPTIONS,
  LOAI_THAY_DOI_TAG_COLOR,
  labelFor,
} from "../../constants";
import "./QuaTrinhCongTacTable.state";

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return "-";
  return value.toLocaleString("vi-VN");
}

// Tổng hợp nội dung thay đổi: chỉ hiển thị những cặp cũ/mới có giá trị mới
// được ghi nhận (Phòng ban / Chức danh / Trạng thái / Mức lương).
function buildNoiDung(record: EmploymentHistory): string {
  const parts: string[] = [];

  if (record.phongBanMoi) {
    parts.push(`Phòng ban: ${record.phongBanCu || "-"} → ${record.phongBanMoi}`);
  }
  if (record.chucDanhMoi) {
    parts.push(`Chức danh: ${record.chucDanhCu || "-"} → ${record.chucDanhMoi}`);
  }
  if (record.trangThaiMoi) {
    const cu = labelFor(TRANG_THAI_MOI_OPTIONS, record.trangThaiCu);
    const moi = labelFor(TRANG_THAI_MOI_OPTIONS, record.trangThaiMoi);
    parts.push(`Trạng thái: ${cu} → ${moi}`);
  }
  if (record.mucLuongMoi !== undefined && record.mucLuongMoi !== null) {
    parts.push(
      `Mức lương: ${formatCurrency(record.mucLuongCu)} → ${formatCurrency(record.mucLuongMoi)}`
    );
  }

  return parts.length > 0 ? parts.join("; ") : "-";
}

export function QuaTrinhCongTacTable() {
  const handler = useQuaTrinhCongTacHandler();
  const [historyList] = useQuaTrinhCongTacState("historyList", [] as EmploymentHistory[]);
  const [employeeList] = useQuaTrinhCongTacState("employeeList", [] as Employee[]);
  const [loading] = useQuaTrinhCongTacState("loading", false);
  const { canCreate, canEdit, canDelete } = usePagePermission(
    "/nhan-su/qua-trinh-cong-tac"
  );

  const [loaiThayDoiFilter, setLoaiThayDoiFilter] = useState<string | undefined>(undefined);
  const [employeeFilter, setEmployeeFilter] = useState<string | undefined>(undefined);

  const handleAdd = () => {
    handler.executeEvent("openForm", {});
  };

  const handleEdit = (record: EmploymentHistory) => {
    handler.executeEvent("openForm", { record });
  };

  const handleDelete = (id: string) => {
    handler.executeEvent("removeHistory", { id });
  };

  const rows = useMemo(() => {
    return historyList.filter((item) => {
      const matchesLoai = loaiThayDoiFilter
        ? item.loaiThayDoi === loaiThayDoiFilter
        : true;
      const matchesEmployee = employeeFilter
        ? item.employeeId === employeeFilter
        : true;
      return matchesLoai && matchesEmployee;
    });
  }, [historyList, loaiThayDoiFilter, employeeFilter]);

  const employeeOptions = useMemo(
    () =>
      employeeList.map((e) => ({
        value: e.id,
        label: `${e.hoTen} (${e.employeeId})`,
      })),
    [employeeList]
  );

  const columns: ColumnsType<EmploymentHistory> = [
    {
      title: "Nhân viên",
      key: "employee",
      render: (_: unknown, record: EmploymentHistory) => (
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
      title: "Loại thay đổi",
      dataIndex: "loaiThayDoi",
      key: "loaiThayDoi",
      width: 150,
      align: "center",
      render: (value: string) => (
        <Tag color={LOAI_THAY_DOI_TAG_COLOR[value] || "default"}>
          {labelFor(LOAI_THAY_DOI_OPTIONS, value)}
        </Tag>
      ),
    },
    {
      title: "Ngày hiệu lực",
      dataIndex: "ngayHieuLuc",
      key: "ngayHieuLuc",
      width: 130,
      render: (value?: string) => value || "-",
    },
    {
      title: "Nội dung",
      key: "noiDung",
      render: (_: unknown, record: EmploymentHistory) => buildNoiDung(record),
    },
    {
      title: "Số QĐ",
      dataIndex: "soQuyetDinh",
      key: "soQuyetDinh",
      width: 130,
      render: (value?: string) => value || "-",
    },
    {
      title: "Hành động",
      key: "action",
      width: 120,
      align: "center",
      render: (_: unknown, record: EmploymentHistory) => (
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
              title="Bạn có chắc muốn xoá quá trình công tác này?"
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
          <h1 className="text-2xl font-bold text-foreground">Quá trình công tác</h1>
          <p className="text-muted-foreground">
            Ghi nhận lịch sử thay đổi điều chuyển, tăng lương, bổ nhiệm, trạng thái của nhân viên
          </p>
        </div>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Ghi nhận thay đổi
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
          placeholder="Lọc theo loại thay đổi"
          style={{ width: 200 }}
          value={loaiThayDoiFilter}
          onChange={(value) => setLoaiThayDoiFilter(value)}
          options={LOAI_THAY_DOI_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </Space>

      <Table<EmploymentHistory>
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
