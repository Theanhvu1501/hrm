import { Table, Tag, Button, Space, Popconfirm } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  useCaLamViecHandler,
  useCaLamViecState,
} from "../../CaLamViecHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { WorkShift } from "@/services/workShiftService";
import "./CaLamViecTable.state";

function formatBreak(record: WorkShift): string {
  if (!record.gioNghiTu || !record.gioNghiDen) return "-";
  return `${record.gioNghiTu} - ${record.gioNghiDen}`;
}

export function CaLamViecTable() {
  const handler = useCaLamViecHandler();
  const [shiftList] = useCaLamViecState("shiftList", [] as WorkShift[]);
  const [loading] = useCaLamViecState("loading", false);
  const { canCreate, canEdit, canDelete } = usePagePermission(
    "/cham-cong/ca-lam-viec"
  );

  const handleAdd = () => {
    handler.executeEvent("openForm", {});
  };

  const handleEdit = (record: WorkShift) => {
    handler.executeEvent("openForm", { record });
  };

  const handleDelete = (id: string) => {
    handler.executeEvent("removeShift", { id });
  };

  const columns: ColumnsType<WorkShift> = [
    {
      title: "Tên ca",
      dataIndex: "ten",
      key: "ten",
    },
    {
      title: "Giờ bắt đầu",
      dataIndex: "gioBatDau",
      key: "gioBatDau",
      width: 120,
      align: "center",
    },
    {
      title: "Giờ kết thúc",
      dataIndex: "gioKetThuc",
      key: "gioKetThuc",
      width: 120,
      align: "center",
    },
    {
      title: "Ca qua đêm",
      dataIndex: "laCaQuaDem",
      key: "laCaQuaDem",
      width: 120,
      align: "center",
      render: (value: boolean) =>
        value ? <Tag color="purple">Qua đêm</Tag> : "-",
    },
    {
      title: "Giờ nghỉ",
      key: "gioNghi",
      width: 150,
      align: "center",
      render: (_: unknown, record: WorkShift) => formatBreak(record),
    },
    {
      title: "Linh hoạt",
      dataIndex: "laLinhHoat",
      key: "laLinhHoat",
      width: 150,
      align: "center",
      render: (value: boolean, record: WorkShift) =>
        value ? (
          <Tag color="blue">
            {record.soPhutLinhHoat ? `± ${record.soPhutLinhHoat} phút` : "Có"}
          </Tag>
        ) : (
          <Tag color="default">Không</Tag>
        ),
    },
    {
      title: "Hành động",
      key: "action",
      width: 110,
      align: "center",
      render: (_: unknown, record: WorkShift) => (
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
              title="Bạn có chắc muốn xoá ca làm việc này?"
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
            Cấu hình ca làm việc
          </h1>
          <p className="text-muted-foreground">
            Quản lý các ca làm việc dùng cho chấm công
          </p>
        </div>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Thêm ca
          </Button>
        )}
      </div>

      <Table<WorkShift>
        columns={columns}
        dataSource={shiftList}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        bordered
        scroll={{ x: "max-content" }}
      />
    </div>
  );
}
