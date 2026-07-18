import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  message,
  Popconfirm,
  Tooltip,
  Typography,
  Row,
  Col,
  Breadcrumb,
  Select,
  Tag,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { FilterBar } from "@/components/common/FilterBar";
import { loaiChungTuService, LoaiChungTuType, PhanLoaiChungTu } from "@/services/loaiChungTuService";
import { z } from "zod";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useBulkDelete } from "@/components/table/useBulkDelete";
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';

const { Text } = Typography;
const { TextArea } = Input;

// Phân loại quyết định chứng từ vào phân hệ nào
const PHAN_LOAI_OPTIONS: { value: PhanLoaiChungTu; label: string; color: string }[] = [
  { value: "THU", label: "Phiếu thu", color: "green" },
  { value: "CHI", label: "Phiếu chi", color: "red" },
  { value: "KHAC", label: "Nhật ký chung", color: "default" },
];
const PHAN_LOAI_MAP = Object.fromEntries(
  PHAN_LOAI_OPTIONS.map((o) => [o.value, o])
) as Record<PhanLoaiChungTu, (typeof PHAN_LOAI_OPTIONS)[number]>;

const loaiChungTuSchema = z.object({
  ma: z
    .string()
    .trim()
    .min(1, "Mã không được để trống")
    .max(50, "Mã tối đa 50 ký tự"),
  ten: z
    .string()
    .trim()
    .min(1, "Tên không được để trống")
    .max(200, "Tên tối đa 200 ký tự"),
  moTa: z.string().max(500, "Mô tả tối đa 500 ký tự").optional().nullable(),
  phanLoai: z.enum(["THU", "CHI", "KHAC"]).optional().nullable(),
});

const LoaiChungTuPage: React.FC = () => {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/danh-muc/loai-chung-tu");
  const [data, setData] = useState<LoaiChungTuType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LoaiChungTuType | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });

  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<LoaiChungTuType>({
    enabled: canDelete,
    itemLabel: "loại chứng từ",
    onDeleteBatch: (ids) => loaiChungTuService.deleteBatch(ids),
    onDone: () => fetchData(),
  });

  const fetchData = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    search = searchText
  ) => {
    // Lựa chọn chỉ có hiệu lực trong trang đang xem: đổi trang / tìm kiếm / lọc / tải lại đều bỏ chọn.
    clearSelection();
    setLoading(true);
    try {
      const result = await loaiChungTuService.getPaginated({
        page,
        limit: pageSize,
        search: search || undefined,
      });
      setData(result.data);
      setPagination({
        current: result.meta.page,
        pageSize: result.meta.limit,
        total: result.meta.total,
      });
    } catch {
      message.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, pagination.pageSize, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTableChange = (paginationConfig: {
    current?: number;
    pageSize?: number;
  }) => {
    fetchData(
      paginationConfig.current || 1,
      paginationConfig.pageSize || 50,
      searchText
    );
  };

  const handleSearch = async (value: string) => {
    setSearchText(value);
  };

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: LoaiChungTuType) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const validated = loaiChungTuSchema.parse(values);

      const maExists = await loaiChungTuService.checkMaExists(
        validated.ma,
        editingRecord?.id
      );
      if (maExists) {
        message.error("Mã loại chứng từ đã tồn tại");
        return;
      }

      if (editingRecord) {
        await loaiChungTuService.update(editingRecord.id, validated);
        message.success("Cập nhật thành công");
      } else {
        await loaiChungTuService.create(validated as Omit<LoaiChungTuType, "id">);
        message.success("Thêm mới thành công");
      }

      setModalVisible(false);
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => message.error(err.message));
      } else if (!(error as any)?.errorFields) {
        message.error((error as any)?.message || "Không thể lưu, vui lòng thử lại");
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await loaiChungTuService.remove(id);
      message.success("Xóa thành công");
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch {
      message.error("Không thể xóa");
    }
  };

  const columns = [
    {
      title: "Mã",
      dataIndex: "ma",
      key: "ma",
      width: 150,
      sorter: (a: LoaiChungTuType, b: LoaiChungTuType) => a.ma.localeCompare(b.ma),
      render: (text: string) => (
        <Text strong className="text-primary">
          {text}
        </Text>
      ),
    },
    {
      title: "Tên loại chứng từ",
      dataIndex: "ten",
      key: "ten",
      ellipsis: true,
      sorter: (a: LoaiChungTuType, b: LoaiChungTuType) => a.ten.localeCompare(b.ten),
    },
    {
      title: "Phân loại",
      dataIndex: "phanLoai",
      key: "phanLoai",
      width: 150,
      render: (value: PhanLoaiChungTu | undefined) => {
        const opt = value ? PHAN_LOAI_MAP[value] : PHAN_LOAI_MAP.KHAC;
        return <Tag color={opt.color}>{opt.label}</Tag>;
      },
    },
    {
      title: "Mô tả",
      dataIndex: "moTa",
      key: "moTa",
      ellipsis: true,
      width: 300,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text type="secondary" className="text-sm">
            {text || "-"}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      fixed: "right" as const,
      render: (_: unknown, record: LoaiChungTuType) => (
        <Space size="small">
          {canEdit && (<Tooltip title="Sửa">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              className="text-primary"
            />
          </Tooltip>)}
          {canDelete && (<Popconfirm
            title="Xác nhận xóa"
            description="Bạn có chắc chắn muốn xóa?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa">
              <Button type="text" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>)}
        </Space>
      ),
    },
  ];

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('danhMuc.loaiChungTu', columns);
  const fl = useFieldLabels('danhMuc.loaiChungTu');

  return (
    <div className="space-y-3">
      <Breadcrumb
        items={[
          { href: "/", title: <HomeOutlined /> },
          { title: "Danh mục" },
          { title: "Loại chứng từ" },
        ]}
      />

      <Card>
        <FilterBar
          search={{
            value: searchText,
            onChange: handleSearch,
            onSearch: () => fetchData(1, pagination.pageSize, searchText),
            placeholder: "Tìm kiếm theo mã hoặc tên...",
            width: 400,
          }}
          onReset={() => {
            setSearchText("");
            fetchData(1, pagination.pageSize, "");
          }}
          actions={
            <>
              {canExport && (
                <Button icon={<ExportOutlined />}>Xuất Excel</Button>
              )}
              {bulkDeleteButton}
              {canCreate && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                >
                  Thêm loại chứng từ
                </Button>
              )}
              {settingsButton}
            </>
          }
        />

        <Table
          columns={cfgColumns}
          dataSource={data}
          rowKey="id"
          rowSelection={rowSelection}
          loading={loading}
          scroll={{ x: 800, y: "calc(100vh - 285px)" }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} loại chứng từ`,
            pageSizeOptions: ["25", "50", "100", "200"],
          }}
          onChange={(pag) =>
            handleTableChange({ current: pag.current, pageSize: pag.pageSize })
          }
        />
      </Card>

      <Modal
        title={editingRecord ? "Sửa loại chứng từ" : "Thêm loại chứng từ mới"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={550}
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small" className="mt-2" initialValues={{ phanLoai: "KHAC" }}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                name="ma"
                label={fl('ma', 'Mã loại chứng từ')}
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập mã" },
                  { max: 50, message: "Mã tối đa 50 ký tự" },
                ]}
              >
                <Input placeholder="VD: THU_TIEN_MAT" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="ten"
                label={fl('ten', 'Tên loại chứng từ')}
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập tên" },
                  { max: 200, message: "Tên tối đa 200 ký tự" },
                ]}
              >
                <Input placeholder="Nhập tên loại chứng từ" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="phanLoai"
            label={fl('phanLoai', 'Phân loại (định tuyến phiếu)')}
            className="mb-3"
            tooltip="Quyết định chứng từ vào phân hệ Phiếu thu, Phiếu chi hay Nhật ký chung"
            rules={[{ required: true, message: "Vui lòng chọn phân loại" }]}
          >
            <Select
              options={PHAN_LOAI_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              placeholder="Chọn phân loại"
            />
          </Form.Item>

          <Form.Item
            name="moTa"
            label={fl('moTa', 'Mô tả')}
            className="mb-0"
            rules={[{ max: 500, message: "Mô tả tối đa 500 ký tự" }]}
          >
            <TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="Nhập mô tả..."
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LoaiChungTuPage;
