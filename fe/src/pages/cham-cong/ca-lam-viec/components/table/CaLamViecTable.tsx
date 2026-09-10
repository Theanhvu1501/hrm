import { useMemo, useState } from "react";
import { Card, Tag, Button, Space, Popconfirm, Tooltip } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  useCaLamViecHandler,
  useCaLamViecState,
} from "../../CaLamViecHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { FilterBar } from "@/components/common/FilterBar";
import { BangDuLieu } from "@/components/table/BangDuLieu";
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

  const [searchText, setSearchText] = useState("");

  const rows = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return keyword
      ? shiftList.filter((item) => item.ten?.toLowerCase().includes(keyword))
      : shiftList;
  }, [shiftList, searchText]);

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
      title: "Thao tác",
      key: "action",
      width: 90,
      align: "center",
      fixed: "right",
      render: (_: unknown, record: WorkShift) => (
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
              description="Bạn có chắc chắn muốn xóa ca làm việc này?"
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
          placeholder: "Tìm theo tên ca làm việc...",
          width: 320,
        }}
        actions={
          canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Thêm ca
            </Button>
          )
        }
      />

      <BangDuLieu<WorkShift>
        columns={columns}
        dataSource={rows}
        rowKey="id"
        loading={loading}
        pagination={{
          defaultPageSize: 50,
          showSizeChanger: true,
          pageSizeOptions: ["25", "50", "100", "200"],
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} ca`,
        }}
      />
    </Card>
  );
}
