import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Tooltip,
  Typography,
  Breadcrumb,
  Popconfirm,
  message,
} from "antd";
import {
  HomeOutlined,
  UploadOutlined,
  ReloadOutlined,
  EyeOutlined,
  DownloadOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  YoutubeOutlined,
  FileOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { usePagePermission } from "@/hooks/usePagePermission";
import { FilterBar } from "@/components/common/FilterBar";
import { useTableColumnFilters } from "@/components/table/useTableColumnFilters";
import { taiLieuService, TaiLieu } from "@/services/taiLieuService";
import UploadTaiLieuModal from "./UploadTaiLieuModal";
import TaiLieuPreviewDrawer from "./TaiLieuPreviewDrawer";

const { Text } = Typography;

interface DocumentLibraryPageProps {
  category: string;
  label: string;
}

const formatSize = (size?: number): string => {
  if (!size) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value?: string): string => {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const renderTypeIcon = (item: TaiLieu): React.ReactNode => {
  if (item.type === "youtube")
    return <YoutubeOutlined style={{ color: "#FF0000", fontSize: 18 }} />;
  const mime = item.mimeType || "";
  if (mime === "application/pdf")
    return <FilePdfOutlined style={{ color: "#D32029", fontSize: 18 }} />;
  if (mime.startsWith("image/"))
    return <FileImageOutlined style={{ color: "#13A8A8", fontSize: 18 }} />;
  if (mime.includes("word"))
    return <FileWordOutlined style={{ color: "#1f7769", fontSize: 18 }} />;
  if (mime.includes("excel") || mime.includes("spreadsheet"))
    return <FileExcelOutlined style={{ color: "#389E0D", fontSize: 18 }} />;
  if (mime.includes("powerpoint") || mime.includes("presentation"))
    return <FilePptOutlined style={{ color: "#D4380D", fontSize: 18 }} />;
  return <FileOutlined style={{ fontSize: 18 }} />;
};

export const DocumentLibraryPage: React.FC<DocumentLibraryPageProps> = ({
  category,
  label,
}) => {
  const { canCreate, canDelete } = usePagePermission("/" + category);
  const [data, setData] = useState<TaiLieu[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<TaiLieu | null>(null);
  // Mỗi loại thư viện là 1 bảng riêng → pageKey theo category (cột ghim lưu riêng).
  const { filterable, matches, hasPinned } = useTableColumnFilters(
    `thu-vien-${category}`,
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await taiLieuService.list(category);
      setData(result);
    } catch {
      message.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Ô tìm kiếm chung + bộ lọc theo cột (cùng áp lên dữ liệu gốc).
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return data.filter((item) => {
      if (q && !item.title.toLowerCase().includes(q)) return false;
      return matches(item, (row, key) =>
        key === "title" ? row.title : row.moTa,
      );
    });
  }, [data, searchText, matches]);

  const handleDownload = async (item: TaiLieu) => {
    try {
      const url = await taiLieuService.fetchFileObjectUrl(item._id);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.tenFile || item.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      message.error("Không tải được file");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await taiLieuService.remove(id);
      message.success("Xoá thành công");
      fetchData();
    } catch {
      message.error("Không thể xoá tài liệu");
    }
  };

  const columns: ColumnsType<TaiLieu> = [
    {
      title: "",
      key: "icon",
      width: 44,
      align: "center" as const,
      render: (_: unknown, record: TaiLieu) => renderTypeIcon(record),
    },
    filterable<TaiLieu>({
      title: "Tiêu đề",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
      render: (text: string) => <Text strong>{text}</Text>,
    }),
    filterable<TaiLieu>({
      title: "Mô tả",
      dataIndex: "moTa",
      key: "moTa",
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text type="secondary">{text || "-"}</Text>
        </Tooltip>
      ),
    }),
    {
      title: "Kích thước",
      dataIndex: "size",
      key: "size",
      width: 110,
      align: "right" as const,
      render: (_: unknown, record: TaiLieu) =>
        record.type === "youtube" ? "-" : formatSize(record.size),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (value: string) => formatDate(value),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 140,
      fixed: "right" as const,
      render: (_: unknown, record: TaiLieu) => (
        <Space size="small">
          <Tooltip title="Xem">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => setPreviewItem(record)}
              className="text-primary"
            />
          </Tooltip>
          {record.type === "file" && (
            <Tooltip title="Tải về">
              <Button
                type="text"
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(record)}
              />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm
              title="Xác nhận xoá"
              description="Bạn có chắc chắn muốn xoá tài liệu này?"
              onConfirm={() => handleDelete(record._id)}
              okText="Xoá"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Xoá">
                <Button type="text" icon={<DeleteOutlined />} danger />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <Breadcrumb
        items={[
          { href: "/", title: <HomeOutlined /> },
          { title: "Thư viện" },
          { title: label },
        ]}
      />

      <Card>
        <FilterBar
          search={{
            value: searchText,
            onChange: setSearchText,
            placeholder: "Tìm kiếm theo tiêu đề...",
            width: 400,
          }}
          actions={
            <>
              <Button icon={<ReloadOutlined />} onClick={fetchData}>
                Làm mới
              </Button>
              {canCreate && (
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  onClick={() => setUploadOpen(true)}
                >
                  Tải lên
                </Button>
              )}
            </>
          }
        />

        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="_id"
          loading={loading}
          size="small"
          className="excel-table"
          // Cột ghim (fixed) cần bảng cuộn ngang được → max-content khi có cột ghim.
          scroll={{ x: hasPinned ? "max-content" : 800, y: "calc(100vh - 285px)" }}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} tài liệu`,
            pageSizeOptions: ["25", "50", "100", "200"],
          }}
        />
      </Card>

      <UploadTaiLieuModal
        open={uploadOpen}
        category={category}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => {
          setUploadOpen(false);
          fetchData();
        }}
      />

      <TaiLieuPreviewDrawer
        item={previewItem}
        open={!!previewItem}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  );
};

export default DocumentLibraryPage;
