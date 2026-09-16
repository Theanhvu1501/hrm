import { useMemo, useState } from "react";
import { Card, Button, Space, Popconfirm, Select, Tooltip, Typography } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import { message } from "antd";
import { apiErrorMessage } from "@/config/api";
import { employeeService } from "@/services/employeeService";
import type { ColumnsType } from "antd/es/table";
import {
  useHoSoNhanVienHandler,
  useHoSoNhanVienState,
} from "../../HoSoNhanVienHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { usePhongBanOptions } from "@/hooks/usePhongBanOptions";
import { Employee } from "@/services/employeeService";
import { FilterBar } from "@/components/common/FilterBar";
import { BangDuLieu } from "@/components/table/BangDuLieu";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  LOAI_HOP_DONG_OPTIONS,
  TRANG_THAI_OPTIONS,
  TRANG_THAI_TONE,
  labelFor,
} from "../../constants";
import "./HoSoNhanVienTable.state";

const { Text } = Typography;

export function HoSoNhanVienTable() {
  const handler = useHoSoNhanVienHandler();
  const [employeeList] = useHoSoNhanVienState("employeeList", [] as Employee[]);
  const [loading] = useHoSoNhanVienState("loading", false);
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission(
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
        ? item.hoTen?.toLowerCase().includes(keyword) ||
          item.employeeId?.toLowerCase().includes(keyword)
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
      width: 110,
      render: (value: string) => (
        <Text strong className="text-primary">
          {value}
        </Text>
      ),
    },
    {
      title: "Họ tên",
      dataIndex: "hoTen",
      key: "hoTen",
      ellipsis: true,
    },
    {
      title: "Phòng ban",
      dataIndex: "departmentId",
      key: "departmentId",
      width: 180,
      ellipsis: true,
      render: (id?: string | null) => tenTheoId(id),
    },
    {
      title: "Chức danh",
      dataIndex: "chucDanh",
      key: "chucDanh",
      width: 180,
      ellipsis: true,
      render: (value?: string) => value || "-",
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
      width: 130,
      align: "center",
      render: (value: string) => (
        <StatusPill tone={TRANG_THAI_TONE[value] ?? "trung-tinh"}>
          {labelFor(TRANG_THAI_OPTIONS, value)}
        </StatusPill>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 90,
      align: "center",
      fixed: "right",
      render: (_: unknown, record: Employee) => (
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
              description="Bạn có chắc chắn muốn xóa hồ sơ nhân viên này?"
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

  /**
   * Xuất bảng khai báo lao động (yêu cầu d9 cột G). Số liệu lấy TỪ BE — mức
   * đóng của mỗi người phụ thuộc căn cứ đóng khai trong Cấu hình lương, dựng
   * lại công thức ở FE là tạo nguồn sự thật thứ hai cho một con số đi thẳng
   * vào tờ khai với cơ quan bảo hiểm.
   */
  const xuatKhaiBaoBH = async () => {
    try {
      const ds = await employeeService.khaiBaoBaoHiem();
      if (ds.length === 0) {
        message.info("Chưa có nhân sự nào để khai báo.");
        return;
      }
      const luoi = ds.map((d) => ({
        STT: d.stt,
        "Mã NV": d.maNhanVien,
        "Họ và tên": d.hoTen,
        "Mã số BHXH": d.soSoBH,
        "Số CCCD": d.cccd,
        "Ngày sinh": d.ngaySinh,
        "Giới tính": d.gioiTinh,
        "Địa chỉ": d.diaChi,
        "Chức danh": d.chucDanh,
        "Tiền lương đóng BH": d.mucDong,
        "Từ ngày": d.tuNgay,
        "Ghi chú": d.ghiChu,
      }));
      const ws = XLSX.utils.json_to_sheet(luoi);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Khai bao BH");
      const homNay = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Khai-bao-lao-dong-BH-${homNay}.xlsx`);
    } catch (err) {
      message.error(apiErrorMessage(err, "Không xuất được bảng khai báo"));
    }
  };

  return (
    <Card>
      <FilterBar
        search={{
          value: searchText,
          onChange: setSearchText,
          placeholder: "Tìm theo mã hoặc họ tên nhân viên...",
          width: 320,
        }}
        filters={
          <Select
            allowClear
            placeholder="Tất cả trạng thái"
            style={{ width: 180 }}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            options={TRANG_THAI_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        }
        actions={
          <Space size={8}>
            {canExport && (
              <Tooltip title="Danh sách nhân sự kèm mức tiền lương làm căn cứ đóng, để nộp cơ quan bảo hiểm">
                <Button icon={<FileExcelOutlined />} onClick={xuatKhaiBaoBH}>
                  Khai báo bảo hiểm
                </Button>
              </Tooltip>
            )}
            {canCreate && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                Thêm nhân viên
              </Button>
            )}
          </Space>
        }
      />

      <BangDuLieu<Employee>
        columns={columns}
        dataSource={rows}
        rowKey="id"
        loading={loading}
        pagination={{
          defaultPageSize: 50,
          showSizeChanger: true,
          pageSizeOptions: ["25", "50", "100", "200"],
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} nhân viên`,
        }}
      />
    </Card>
  );
}
