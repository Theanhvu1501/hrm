import { useMemo, useState } from "react";
import { Card, Tag, Button, Space, Popconfirm, Tooltip } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  useDiaDiemChamCongHandler,
  useDiaDiemChamCongState,
} from "../../DiaDiemChamCongHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { FilterBar } from "@/components/common/FilterBar";
import { BangDuLieu } from "@/components/table/BangDuLieu";
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

  const [searchText, setSearchText] = useState("");

  const rows = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return keyword
      ? locationList.filter((item) => item.ten?.toLowerCase().includes(keyword))
      : locationList;
  }, [locationList, searchText]);

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
      title: "Thao tác",
      key: "action",
      width: 90,
      align: "center",
      fixed: "right",
      render: (_: unknown, record: AttendanceLocation) => (
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
              description="Bạn có chắc chắn muốn xóa địa điểm này?"
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
        search={{
          value: searchText,
          onChange: setSearchText,
          placeholder: "Tìm theo tên địa điểm...",
          width: 320,
        }}
        actions={
          canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Thêm địa điểm
            </Button>
          )
        }
      />

      <BangDuLieu<AttendanceLocation>
        columns={columns}
        dataSource={rows}
        rowKey="id"
        loading={loading}
        pagination={{
          defaultPageSize: 50,
          showSizeChanger: true,
          pageSizeOptions: ["25", "50", "100", "200"],
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} địa điểm`,
        }}
      />
    </Card>
  );
}
