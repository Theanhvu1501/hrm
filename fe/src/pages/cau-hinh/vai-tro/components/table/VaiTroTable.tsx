import { Table, Tag, Button, Space, Popconfirm } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo } from "react";
import { useVaiTroHandler, useVaiTroState } from "../../VaiTroHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { VaiTroItem } from "./VaiTroTable.state";
import "./VaiTroTable.state";
import { useTableTitleConfig } from "@/components/glossary/useTableTitleConfig";
import { useTableColumnFilters } from "@/components/table/useTableColumnFilters";

interface VaiTroTableProps {
  onSettingsButton?: (node: React.ReactNode) => void;
}

export function VaiTroTable({ onSettingsButton }: VaiTroTableProps) {
  const handler = useVaiTroHandler();
  const [vaiTroList] = useVaiTroState("vaiTroList", [] as VaiTroItem[]);
  const [loading] = useVaiTroState("loading", false);
  const { canEdit, canDelete } = usePagePermission("/cau-hinh/vai-tro");
  const { filterable, matches, hasPinned } =
    useTableColumnFilters("cau-hinh-vai-tro");

  const handleEdit = (record: VaiTroItem) => {
    handler.executeEvent("openModal", { record });
  };

  const handleDelete = (id: string) => {
    handler.executeEvent("deleteVaiTro", { id });
  };

  const columns: ColumnsType<VaiTroItem> = [
    filterable<VaiTroItem>({
      title: "Tên vai trò",
      dataIndex: "ten",
      key: "ten",
      width: 200,
    }),
    filterable<VaiTroItem>({
      title: "Mô tả",
      dataIndex: "moTa",
      key: "moTa",
    }),
    {
      title: "Số người dùng",
      dataIndex: "soNguoiDung",
      key: "soNguoiDung",
      width: 140,
      align: "center",
    },
    {
      title: "Trạng thái",
      dataIndex: "trangThai",
      key: "trangThai",
      width: 140,
      align: "center",
      render: (trangThai: VaiTroItem["trangThai"]) => (
        <Tag color={trangThai === "HOAT_DONG" ? "green" : "red"}>
          {trangThai === "HOAT_DONG" ? "Hoạt động" : "Khoá"}
        </Tag>
      ),
    },
    {
      title: "Hành động",
      key: "action",
      width: 140,
      align: "center",
      render: (_: unknown, record: VaiTroItem) => (
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
              title="Bạn có chắc muốn xoá vai trò này?"
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

  // Bọc filterable TRƯỚC rồi mới đưa vào useTableTitleConfig: hook đổi tiêu đề/ẩn cột chỉ
  // spread lại cột nên giữ nguyên filterDropdown + fixed do filterable gắn vào.
  const { columns: cfgColumns, settingsButton } = useTableTitleConfig<VaiTroItem>('cauHinh.vaiTro', columns);

  useEffect(() => {
    onSettingsButton?.(settingsButton);
  }, [settingsButton, onSettingsButton]);

  const rows = useMemo(
    () =>
      vaiTroList.filter((r) =>
        matches(r, (row, key) => (key === "ten" ? row.ten : row.moTa)),
      ),
    [vaiTroList, matches],
  );

  return (
    <Table<VaiTroItem>
      columns={cfgColumns}
      dataSource={rows}
      rowKey="id"
      loading={loading}
      pagination={{ pageSize: 10 }}
      bordered
      // Cột ghim (fixed) chỉ có tác dụng khi bảng cuộn ngang được → cần scroll.x.
      scroll={{ x: hasPinned ? "max-content" : undefined }}
    />
  );
}
