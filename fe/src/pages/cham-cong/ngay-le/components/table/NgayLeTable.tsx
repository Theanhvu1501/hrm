import { Table, Button, Tag, Space, Popconfirm, Select } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useNgayLeHandler, useNgayLeState } from "../../NgayLeHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
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
      title: "Hành động",
      key: "thaoTac",
      width: 100,
      align: "center",
      render: (_: unknown, record: Holiday) => (
        <Space>
          {canEdit && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handler.executeEvent("openForm", { record })}
            />
          )}
          {canDelete && (
            <Popconfirm
              title="Xoá ngày lễ này?"
              okText="Xoá"
              cancelText="Huỷ"
              onConfirm={() =>
                handler.executeEvent("removeHoliday", { id: record.id })
              }
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
          <h1 className="text-2xl font-bold text-foreground">Ngày nghỉ lễ</h1>
          <p className="text-muted-foreground">
            Quản lý danh mục ngày nghỉ lễ dùng cho chấm công
          </p>
        </div>
        <Space>
          <Select
            value={nam}
            style={{ width: 120 }}
            options={DS_NAM.map((n) => ({ value: n, label: `Năm ${n}` }))}
            onChange={(v) => handler.executeEvent("doiNam", { nam: v })}
          />
          {canCreate && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handler.executeEvent("openForm", {})}
            >
              Thêm ngày lễ
            </Button>
          )}
        </Space>
      </div>

      <Table<Holiday>
        columns={columns}
        dataSource={holidayList}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        bordered
        scroll={{ x: "max-content" }}
      />
    </div>
  );
}
