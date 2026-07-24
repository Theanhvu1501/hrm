import { useMemo, useState } from "react";
import { Table, Tag, Button, Space, Popconfirm, Select } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  useDonChamCongHandler,
  useDonChamCongState,
} from "../../DonChamCongHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useAuth } from "@/contexts/AuthContext";
import { AttendanceRequest } from "@/services/attendanceRequestService";
import { Employee } from "@/services/employeeService";
import {
  BUOI_OPTIONS,
  LOAI_DON_OPTIONS,
  LOAI_NGHI_OPTIONS,
  TRANG_THAI_OPTIONS,
  TRANG_THAI_TAG_COLOR,
  labelFor,
} from "../../constants";
import { khoangNgay, khungGio, soLieuDon } from "../../hienThiDon";
import "./DonChamCongTable.state";

export function DonChamCongTable() {
  const handler = useDonChamCongHandler();
  const { user } = useAuth();
  const [requestList] = useDonChamCongState("requestList", [] as AttendanceRequest[]);
  const [employeeList] = useDonChamCongState("employeeList", [] as Employee[]);
  const [loading] = useDonChamCongState("loading", false);
  const { canCreate, canEdit, canDelete } = usePagePermission("/cham-cong/don-tu");

  const [loaiDonFilter, setLoaiDonFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [employeeFilter, setEmployeeFilter] = useState<string | undefined>(undefined);

  const handleAdd = () => {
    handler.executeEvent("openForm", {});
  };

  const handleEdit = (record: AttendanceRequest) => {
    handler.executeEvent("openForm", { record });
  };

  const handleDelete = (id: string) => {
    handler.executeEvent("removeRequest", { id });
  };

  const handleApprove = (record: AttendanceRequest) => {
    handler.executeEvent("updateRequestStatus", {
      id: record.id,
      trangThai: "da_duyet",
      nguoiDuyet: user?.hoTen,
    });
  };

  const handleReject = (record: AttendanceRequest) => {
    handler.executeEvent("updateRequestStatus", {
      id: record.id,
      trangThai: "tu_choi",
      nguoiDuyet: user?.hoTen,
    });
  };

  const rows = useMemo(() => {
    return requestList.filter((item) => {
      const matchesLoaiDon = loaiDonFilter ? item.loaiDon === loaiDonFilter : true;
      const matchesStatus = statusFilter ? item.trangThai === statusFilter : true;
      const matchesEmployee = employeeFilter
        ? item.employeeId === employeeFilter
        : true;
      return matchesLoaiDon && matchesStatus && matchesEmployee;
    });
  }, [requestList, loaiDonFilter, statusFilter, employeeFilter]);

  const employeeOptions = useMemo(
    () =>
      employeeList.map((e) => ({
        value: e.id,
        label: `${e.hoTen} (${e.employeeId})`,
      })),
    [employeeList]
  );

  const columns: ColumnsType<AttendanceRequest> = [
    {
      title: "Nhân viên",
      key: "employee",
      render: (_: unknown, record: AttendanceRequest) => (
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
      title: "Loại đơn",
      key: "loaiDon",
      width: 150,
      align: "center",
      render: (_: unknown, record: AttendanceRequest) => (
        <div>
          <div>{labelFor(LOAI_DON_OPTIONS, record.loaiDon)}</div>
          {/* Loại nghỉ và nửa buổi là hai thứ đổi hẳn ý nghĩa của đơn nghỉ —
              "Nghỉ phép · Không lương" khác xa "Nghỉ phép · Phép năm". */}
          {record.loaiNghi && (
            <div className="text-xs text-muted-foreground">
              {labelFor(LOAI_NGHI_OPTIONS, record.loaiNghi)}
            </div>
          )}
          {record.buoi && record.buoi !== "ca_ngay" && (
            <div className="text-xs text-muted-foreground">
              {labelFor(BUOI_OPTIONS, record.buoi)}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Ngày",
      key: "ngay",
      width: 180,
      // Đơn nghỉ nhiều ngày phải thấy được cả hai đầu khoảng: cột cũ chỉ hiện
      // `ngay` nên đơn nghỉ 5 ngày trông y hệt đơn nghỉ 1 ngày.
      render: (_: unknown, record: AttendanceRequest) => khoangNgay(record),
    },
    {
      title: "Giờ",
      key: "gio",
      width: 130,
      render: (_: unknown, record: AttendanceRequest) => khungGio(record),
    },
    {
      title: "Số liệu",
      key: "soLieu",
      width: 130,
      align: "center",
      // Số ngày nghỉ / số giờ OT × hệ số — do backend tính (luat-don.ts). HR
      // cần thấy con số này TRƯỚC khi bấm Duyệt, vì duyệt xong là nó đi thẳng
      // vào bảng công.
      render: (_: unknown, record: AttendanceRequest) => soLieuDon(record),
    },
    {
      title: "Lý do",
      dataIndex: "lyDo",
      key: "lyDo",
      render: (value?: string) => value || "-",
      ellipsis: true,
    },
    {
      title: "Trạng thái",
      key: "trangThai",
      width: 220,
      align: "center",
      render: (_: unknown, record: AttendanceRequest) => (
        <Space>
          <Tag color={TRANG_THAI_TAG_COLOR[record.trangThai] || "default"}>
            {labelFor(TRANG_THAI_OPTIONS, record.trangThai)}
          </Tag>
          {canEdit && record.trangThai === "cho_duyet" && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => handleApprove(record)}
              >
                Duyệt
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => handleReject(record)}
              >
                Từ chối
              </Button>
            </>
          )}
        </Space>
      ),
    },
    {
      title: "Người duyệt",
      dataIndex: "nguoiDuyet",
      key: "nguoiDuyet",
      width: 140,
      render: (value?: string) => value || "-",
    },
    {
      title: "Hành động",
      key: "action",
      width: 120,
      align: "center",
      render: (_: unknown, record: AttendanceRequest) => (
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
              title="Bạn có chắc muốn xoá đơn này?"
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
          <h1 className="text-2xl font-bold text-foreground">Đơn chấm công</h1>
          <p className="text-muted-foreground">
            Quản lý đơn giải trình, làm thêm giờ, nghỉ phép và nghỉ bù của
            nhân viên
          </p>
        </div>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Tạo đơn
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
          placeholder="Lọc theo loại đơn"
          style={{ width: 180 }}
          value={loaiDonFilter}
          onChange={(value) => setLoaiDonFilter(value)}
          options={LOAI_DON_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
        <Select
          allowClear
          placeholder="Lọc theo trạng thái"
          style={{ width: 180 }}
          value={statusFilter}
          onChange={(value) => setStatusFilter(value)}
          options={TRANG_THAI_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </Space>

      <Table<AttendanceRequest>
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
