import { Card, Button, Tag, Space, Popconfirm, Select, Tooltip } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useNgayLeHandler, useNgayLeState } from "../../NgayLeHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { FilterBar } from "@/components/common/FilterBar";
import { BangDuLieu } from "@/components/table/BangDuLieu";
import { Holiday } from "@/services/holidayService";
import { homNayVN } from "@/ultils/thoiGianVN";
import "./NgayLeTable.state";

// homNayVN() (múi giờ Asia/Ho_Chi_Minh cố định) chứ không dùng
// new Date().getFullYear() — máy người xem ở múi giờ khác có thể lệch năm.
const NAM_HIEN_TAI = Number(homNayVN().slice(0, 4));
const DS_NAM = [NAM_HIEN_TAI - 1, NAM_HIEN_TAI, NAM_HIEN_TAI + 1];

export function NgayLeTable() {
  const handler = useNgayLeHandler();
  const [holidayList] = useNgayLeState("holidayList", [] as Holiday[]);
  const [loading] = useNgayLeState("loading", false);
  const [nam] = useNgayLeState("nam", NAM_HIEN_TAI);
  const { canCreate, canEdit, canDelete } = usePagePermission("/cham-cong/ngay-le");

  const columns: ColumnsType<Holiday> = [
    { title: "Tên", dataIndex: "ten", key: "ten" },
    { title: "Từ ngày", dataIndex: "tuNgay", key: "tuNgay", width: 120 },
    { title: "Đến ngày", dataIndex: "denNgay", key: "denNgay", width: 120 },
    {
      title: "Loại",
      dataIndex: "loai",
      key: "loai",
      width: 140,
      render: (v: string) =>
        v === "le" ? (
          <Tag color="red">Lễ luật định</Tag>
        ) : (
          <Tag color="blue">Công ty cho nghỉ</Tag>
        ),
    },
    {
      title: "Hưởng lương",
      dataIndex: "huongLuong",
      key: "huongLuong",
      width: 120,
      align: "center",
      render: (v: boolean) => (v ? "Có" : "Không"),
    },
    { title: "Ghi chú", dataIndex: "moTa", key: "moTa" },
    {
      title: "Thao tác",
      key: "thaoTac",
      width: 90,
      align: "center",
      fixed: "right",
      render: (_: unknown, record: Holiday) => (
        <Space size="small">
          {canEdit && (
            <Tooltip title="Sửa">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => handler.executeEvent("openForm", { record })}
                className="text-primary"
              />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm
              title="Xác nhận xóa"
              description="Bạn có chắc chắn muốn xóa ngày lễ này?"
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() =>
                handler.executeEvent("removeHoliday", { id: record.id })
              }
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
          <Select
            value={nam}
            style={{ width: 120 }}
            options={DS_NAM.map((n) => ({ value: n, label: `Năm ${n}` }))}
            onChange={(v) => handler.executeEvent("doiNam", { nam: v })}
          />
        }
        actions={
          canCreate && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handler.executeEvent("openForm", {})}
            >
              Thêm ngày lễ
            </Button>
          )
        }
      />

      <BangDuLieu<Holiday>
        columns={columns}
        dataSource={holidayList}
        rowKey="id"
        loading={loading}
        pagination={{
          defaultPageSize: 50,
          showSizeChanger: true,
          pageSizeOptions: ["25", "50", "100", "200"],
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} ngày lễ`,
        }}
      />
    </Card>
  );
}
