import { useMemo, useState } from "react";
import {
  Card,
  Tag,
  Button,
  Space,
  Popconfirm,
  Select,
  Tooltip,
  message,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  useQuaTrinhCongTacHandler,
  useQuaTrinhCongTacState,
} from "../../QuaTrinhCongTacHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { FilterBar } from "@/components/common/FilterBar";
import { BangDuLieu } from "@/components/table/BangDuLieu";
import {
  EmploymentHistory,
  employmentHistoryService,
} from "@/services/employmentHistoryService";
import { printHtml } from "@/utils/printHtml";
import { apiErrorMessage } from "@/config/api";
import { Employee } from "@/services/employeeService";
import {
  LOAI_THAY_DOI_OPTIONS,
  LOAI_THAY_DOI_LABEL,
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
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission(
    "/nhan-su/qua-trinh-cong-tac"
  );

  const [loaiThayDoiFilter, setLoaiThayDoiFilter] = useState<string | undefined>(undefined);
  const [employeeFilter, setEmployeeFilter] = useState<string | undefined>(undefined);

  const handleAdd = () => {
    handler.executeEvent("openForm", {});
  };

  /**
   * In phụ lục hợp đồng cho một quyết định (yêu cầu d13). Dùng chung cơ chế
   * in (iframe sandbox) với hợp đồng và phiếu lương — không dựng bản thứ hai.
   */
  const inPhuLuc = async (record: EmploymentHistory) => {
    try {
      const { html } = await employmentHistoryService.phuLuc(record.id);
      printHtml(html, `Phụ lục HĐ — ${record.employeeName ?? ""}`);
    } catch (err) {
      message.error(apiErrorMessage(err, "Không in được phụ lục"));
    }
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
          {/* Đọc từ bảng NHÃN, không từ danh sách chọn: bản ghi cũ mang
              loại đã bỏ khỏi ô chọn vẫn phải hiện đúng chữ. */}
          {LOAI_THAY_DOI_LABEL[value] ?? labelFor(LOAI_THAY_DOI_OPTIONS, value)}
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
      title: "Thao tác",
      key: "action",
      width: 120,
      align: "center",
      fixed: "right",
      render: (_: unknown, record: EmploymentHistory) => (
        <Space size="small">
          {canExport && (
            <Tooltip title="In phụ lục hợp đồng">
              <Button
                type="text"
                icon={<PrinterOutlined />}
                onClick={() => void inPhuLuc(record)}
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
              description="Bạn có chắc chắn muốn xóa quá trình công tác này?"
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
              placeholder="Lọc theo loại thay đổi"
              style={{ width: 200 }}
              value={loaiThayDoiFilter}
              onChange={(value) => setLoaiThayDoiFilter(value)}
              options={LOAI_THAY_DOI_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </>
        }
        actions={
          canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Ghi nhận thay đổi
            </Button>
          )
        }
      />

      <BangDuLieu<EmploymentHistory>
        columns={columns}
        dataSource={rows}
        rowKey="id"
        loading={loading}
        pagination={{
          defaultPageSize: 50,
          showSizeChanger: true,
          pageSizeOptions: ["25", "50", "100", "200"],
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} bản ghi`,
        }}
      />
    </Card>
  );
}
