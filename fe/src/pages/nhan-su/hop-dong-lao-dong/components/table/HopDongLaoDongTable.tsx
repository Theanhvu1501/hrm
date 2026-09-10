import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button, Space, Popconfirm, Select, Tooltip, Typography } from "antd";
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
import { FilterBar } from "@/components/common/FilterBar";
import { BangDuLieu } from "@/components/table/BangDuLieu";
import { StatusPill } from "@/components/ui/StatusPill";
import { LaborContract } from "@/services/laborContractService";
import { Employee } from "@/services/employeeService";
import {
  LOAI_HOP_DONG_OPTIONS,
  TRANG_THAI_OPTIONS,
  TRANG_THAI_TONE,
  labelFor,
} from "../../constants";
import { HopDongPrintModal } from "../print/HopDongPrintModal";
import "./HopDongLaoDongTable.state";

const { Text } = Typography;

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
      render: (value: string) => (
        <Text strong className="text-primary">
          {value}
        </Text>
      ),
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
          <StatusPill tone={TRANG_THAI_TONE[record.trangThai] ?? "trung-tinh"}>
            {labelFor(TRANG_THAI_OPTIONS, record.trangThai)}
          </StatusPill>
        ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 120,
      align: "center",
      fixed: "right",
      render: (_: unknown, record: LaborContract) => (
        <Space size="small">
          {canExport && (
            <Tooltip title="In hợp đồng">
              <Button
                type="text"
                icon={<PrinterOutlined />}
                onClick={() => setPrintTarget(record)}
              />
            </Tooltip>
          )}
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
              description="Bạn có chắc chắn muốn xóa hợp đồng này?"
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
          <>
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
          </>
        }
      />

      <BangDuLieu<LaborContract>
        columns={columns}
        dataSource={rows}
        rowKey="id"
        loading={loading}
        pagination={{
          defaultPageSize: 50,
          showSizeChanger: true,
          pageSizeOptions: ["25", "50", "100", "200"],
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} hợp đồng`,
        }}
      />

      <HopDongPrintModal
        open={!!printTarget}
        contractId={printTarget?.id}
        contractLabel={printTarget?.contractNo}
        onClose={() => setPrintTarget(null)}
      />
    </Card>
  );
}
