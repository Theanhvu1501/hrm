import { Table, Tag, Button, Space, Popconfirm } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  useDiaDiemChamCongHandler,
  useDiaDiemChamCongState,
} from "../../DiaDiemChamCongHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { AttendanceLocation } from "@/services/attendanceLocationService";
import { LOAI_DIA_DIEM_OPTIONS, labelFor } from "../../constants";
import "./DiaDiemChamCongTable.state";

const LOAI_TAG_COLOR: Record<string, string> = {
  gps: "green",
  wifi: "blue",
  qr: "purple",
};

function formatThongTin(record: AttendanceLocation): string {
  if (record.loai === "gps") {
    if (record.latitude === undefined || record.longitude === undefined) {
      return "-";
    }
    const banKinh =
      record.banKinh !== undefined ? ` (bán kính ${record.banKinh}m)` : "";
    return `${record.latitude}, ${record.longitude}${banKinh}`;
  }
  if (record.loai === "wifi") {
    return record.ipWifi || "-";
  }
  if (record.loai === "qr") {
    return record.maQr || "-";
  }
  return "-";
}

function formatChiNhanhPhongBan(record: AttendanceLocation): string {
  const parts = [record.chiNhanh, record.phongBan].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "-";
}

export function DiaDiemChamCongTable() {
  const handler = useDiaDiemChamCongHandler();
  const [locationList] = useDiaDiemChamCongState(
    "locationList",
    [] as AttendanceLocation[]
  );
  const [loading] = useDiaDiemChamCongState("loading", false);
  const { canCreate, canEdit, canDelete } = usePagePermission(
    "/cham-cong/dia-diem"
  );

  const handleAdd = () => {
    handler.executeEvent("openForm", {});
  };

  const handleEdit = (record: AttendanceLocation) => {
    handler.executeEvent("openForm", { record });
  };

  const handleDelete = (id: string) => {
    handler.executeEvent("removeLocation", { id });
  };

  const columns: ColumnsType<AttendanceLocation> = [
    {
      title: "Tên",
      dataIndex: "ten",
      key: "ten",
    },
    {
      title: "Loại",
      dataIndex: "loai",
      key: "loai",
      width: 110,
      align: "center",
      render: (value: string) => (
        <Tag color={LOAI_TAG_COLOR[value] || "default"}>
          {labelFor(LOAI_DIA_DIEM_OPTIONS, value)}
        </Tag>
      ),
    },
    {
      title: "Thông tin",
      key: "thongTin",
      render: (_: unknown, record: AttendanceLocation) => formatThongTin(record),
    },
    {
      title: "Chi nhánh / Phòng ban",
      key: "chiNhanhPhongBan",
      width: 220,
      render: (_: unknown, record: AttendanceLocation) =>
        formatChiNhanhPhongBan(record),
    },
    {
      title: "Hành động",
      key: "action",
      width: 110,
      align: "center",
      render: (_: unknown, record: AttendanceLocation) => (
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
              title="Bạn có chắc muốn xoá địa điểm này?"
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
          <h1 className="text-2xl font-bold text-foreground">
            Địa điểm chấm công
          </h1>
          <p className="text-muted-foreground">
            Quản lý các địa điểm cho phép chấm công (GPS/Wifi/QR)
          </p>
        </div>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Thêm địa điểm
          </Button>
        )}
      </div>

      <Table<AttendanceLocation>
        columns={columns}
        dataSource={locationList}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        bordered
        scroll={{ x: "max-content" }}
      />
    </div>
  );
}
