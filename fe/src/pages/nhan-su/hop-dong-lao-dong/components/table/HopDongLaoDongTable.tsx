import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Tag, Button, Space, Popconfirm, Select } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  PrinterOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  useHopDongLaoDongHandler,
  useHopDongLaoDongState,
} from "../../HopDongLaoDongHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { LaborContract } from "@/services/laborContractService";
import { Employee } from "@/services/employeeService";
import {
  LOAI_HOP_DONG_OPTIONS,
  TRANG_THAI_OPTIONS,
  TRANG_THAI_TAG_COLOR,
  labelFor,
} from "../../constants";
import { HopDongPrintModal } from "../print/HopDongPrintModal";
import "./HopDongLaoDongTable.state";

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return "-";
  return value.toLocaleString("vi-VN");
}

export function HopDongLaoDongTable() {
  const handler = useHopDongLaoDongHandler();
  const [contractList] = useHopDongLaoDongState("contractList", [] as LaborContract[]);
  const [employeeList] = useHopDongLaoDongState("employeeList", [] as Employee[]);
  const [loading] = useHopDongLaoDongState("loading", false);
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission(
    "/nhan-su/hop-dong-lao-dong"
  );

  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [employeeFilter, setEmployeeFilter] = useState<string | undefined>(undefined);
  const [printTarget, setPrintTarget] = useState<LaborContract | null>(null);

  const handleAdd = () => {
    handler.executeEvent("openForm", {});
  };

  const handleEdit = (record: LaborContract) => {
    handler.executeEvent("openForm", { record });
  };

  const handleDelete = (id: string) => {
    handler.executeEvent("removeContract", { id });
  };

  const handleStatusChange = (record: LaborContract, trangThai: string) => {
    handler.executeEvent("updateContractStatus", { id: record.id, trangThai });
  };

  const rows = useMemo(() => {
    return contractList.filter((item) => {
      const matchesStatus = statusFilter ? item.trangThai === statusFilter : true;
      const matchesEmployee = employeeFilter
        ? item.employeeId === employeeFilter
        : true;
      return matchesStatus && matchesEmployee;
    });
  }, [contractList, statusFilter, employeeFilter]);

  const employeeOptions = useMemo(
    () =>
      employeeList.map((e) => ({
        value: e.id,
        label: `${e.hoTen} (${e.employeeId})`,
      })),
    [employeeList]
  );

  const columns: ColumnsType<LaborContract> = [
    {
      title: "Số HĐ",
      dataIndex: "contractNo",
      key: "contractNo",
      width: 120,
    },
    {
      title: "Nhân viên",
      key: "employee",
      render: (_: unknown, record: LaborContract) => (
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
      title: "Loại HĐ",
      dataIndex: "loaiHopDong",
      key: "loaiHopDong",
      width: 170,
      align: "center",
      render: (value: string) => labelFor(LOAI_HOP_DONG_OPTIONS, value),
    },
    {
      title: "Ngày bắt đầu",
      dataIndex: "ngayBatDau",
      key: "ngayBatDau",
      width: 130,
      render: (value?: string) => value || "-",
    },
    {
      title: "Ngày kết thúc",
      dataIndex: "ngayKetThuc",
      key: "ngayKetThuc",
      width: 150,
      render: (value: string | undefined, record: LaborContract) =>
        record.loaiHopDong === "khong_xac_dinh_thoi_han"
          ? "Không xác định"
          : value || "-",
    },
    {
      title: "Mức lương",
      dataIndex: "mucLuong",
      key: "mucLuong",
      width: 130,
      align: "right",
      render: (value?: number) => formatCurrency(value),
    },
    {
      title: "Trạng thái",
      key: "trangThai",
      width: 180,
      align: "center",
      render: (_: unknown, record: LaborContract) =>
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
      render: (_: unknown, record: LaborContract) => (
        <Space>
          {canExport && (
            <Button
              type="text"
              icon={<PrinterOutlined />}
              title="In hợp đồng"
              onClick={() => setPrintTarget(record)}
            />
          )}
          {canEdit && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          )}
          {canDelete && (
            <Popconfirm
              title="Bạn có chắc muốn xoá hợp đồng này?"
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
          <h1 className="text-2xl font-bold text-foreground">Hợp đồng lao động</h1>
          <p className="text-muted-foreground">
            Quản lý hợp đồng lao động của nhân viên
          </p>
        </div>
        <Space>
          {/* Soạn mẫu đã chuyển sang màn riêng `Nhân sự → Mẫu in hợp đồng`:
              giờ có NHIỀU mẫu nên một modal không còn chứa nổi, và cấu hình
              in không thuộc về thanh công cụ của danh sách hợp đồng. */}
          {canEdit && (
            <Button
              icon={<SettingOutlined />}
              onClick={() => navigate("/nhan-su/mau-in-hop-dong")}
            >
              Mẫu in hợp đồng
            </Button>
          )}
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Thêm hợp đồng
            </Button>
          )}
        </Space>
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

      <Table<LaborContract>
        columns={columns}
        dataSource={rows}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        bordered
        scroll={{ x: "max-content" }}
      />

      <HopDongPrintModal
        open={!!printTarget}
        contractId={printTarget?.id}
        contractLabel={printTarget?.contractNo}
        onClose={() => setPrintTarget(null)}
      />
    </div>
  );
}
