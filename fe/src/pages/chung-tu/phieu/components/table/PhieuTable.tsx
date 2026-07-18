import dayjs from "dayjs";
import { Table, Button, Space, Tooltip, Popconfirm, Typography } from "antd";
import type { ColumnType } from "antd/es/table";
import {
  PrinterOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { toast } from "sonner";
import { usePhieuState, usePhieuHandler, usePhieuConfig } from "../../PhieuHandlerContext";
import { formatCurrency } from "../../lib/format";
import { usePrintPhieu } from "../../lib/usePrintPhieu";
import { ChungTu } from "@/types";

const { Text } = Typography;

/** Hook xuất mảng cột gốc (chưa áp override nhãn) để parent có thể bọc qua useTableTitleConfig. */
export function usePhieuTableColumns(): ColumnType<ChungTu>[] {
  const handler = usePhieuHandler();
  const config = usePhieuConfig();
  const print = usePrintPhieu();
  const [, setViewModalPhieu] = usePhieuState("viewModalPhieu", null);
  const [, setEditingPhieu] = usePhieuState("editingPhieu", null);
  const [, setFormModalOpen] = usePhieuState("formModalOpen", false);

  const handleDelete = async (id: string) => {
    try {
      const ok = await handler.executeEvent("deletePhieu", { id });
      if (ok) toast.success("Đã xóa phiếu");
      else toast.error("Xóa thất bại");
    } catch {
      toast.error("Xóa thất bại");
    }
  };

  const moneyColor = config.loai === "PHIEU_THU" ? "#16a34a" : "#dc2626";

  return [
    {
      title: "Số phiếu",
      dataIndex: "soPhieu",
      key: "soPhieu",
      width: 120,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Ngày",
      dataIndex: "ngay",
      key: "ngay",
      width: 110,
      render: (ngay: string) => (ngay ? dayjs(ngay).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Nội dung",
      dataIndex: "noiDung",
      key: "noiDung",
      ellipsis: true,
    },
    {
      title: "Đối tượng",
      key: "doiTuong",
      width: 160,
      ellipsis: true,
      render: (_: unknown, row: ChungTu) => row.danhMuc?.doiTuong?.ten ?? "-",
    },
    {
      title: "TK Nợ",
      key: "tkNo",
      width: 90,
      render: (_: unknown, row: ChungTu) => row.danhMuc?.taiKhoanNo?.ma ?? "-",
    },
    {
      title: "TK Có",
      key: "tkCo",
      width: 90,
      render: (_: unknown, row: ChungTu) => row.danhMuc?.taiKhoanCo?.ma ?? "-",
    },
    {
      title: "Số tiền",
      dataIndex: "soTien",
      key: "soTien",
      width: 140,
      align: "right" as const,
      render: (v: number) => (
        <Text strong style={{ color: moneyColor }}>
          {formatCurrency(v)}
        </Text>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 130,
      align: "center" as const,
      render: (_: unknown, row: ChungTu) => (
        <Space size="small">
          <Tooltip title="In / Xuất PDF">
            <Button
              type="text"
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => print(row)}
            />
          </Tooltip>
          <Tooltip title="Xem">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => setViewModalPhieu(row)}
            />
          </Tooltip>
          <Tooltip title="Sửa">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              className="!text-primary hover:!bg-primary/10"
              onClick={() => {
                setEditingPhieu(row);
                setFormModalOpen(true);
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Xác nhận xóa"
            description={`Xóa phiếu ${row.soPhieu}?`}
            onConfirm={() => handleDelete(row.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa">
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                className="!text-destructive hover:!bg-destructive/10"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];
}

export function PhieuTable({ columns }: { columns: ColumnType<ChungTu>[] }) {
  const handler = usePhieuHandler();
  const [data] = usePhieuState("data", [] as ChungTu[]);
  const [loading] = usePhieuState("loading", false);
  const [pagination] = usePhieuState("pagination", {
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
  });

  return (
    <Table<ChungTu>
      className="excel-table"
      columns={columns}
      dataSource={data}
      rowKey="id"
      loading={loading}
      size="middle"
      scroll={{ x: 1100, y: "calc(100vh - 380px)" }}
      pagination={{
        current: pagination?.page ?? 1,
        pageSize: pagination?.limit ?? 50,
        total: pagination?.total ?? 0,
        showSizeChanger: true,
        showTotal: (total) => `Tổng ${total} phiếu`,
        pageSizeOptions: ["20", "50", "100", "200"],
      }}
      onChange={(pag) =>
        handler.executeEvent("loadPage", {
          page: pag.current ?? 1,
          limit: pag.pageSize ?? 50,
        })
      }
    />
  );
}
