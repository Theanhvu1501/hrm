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
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ReloadOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { Kho } from "@/types";
import { khoService } from "@/services/khoService";
import { z } from "zod";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useBulkDelete } from "@/components/table/useBulkDelete";
import { FilterBar } from "@/components/common/FilterBar";
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';

const { Text } = Typography;
const { TextArea } = Input;

const khoSchema = z.object({
  ma: z
    .string()
    .trim()
    .min(1, "Mã không được để trống")
    .max(20, "Mã tối đa 20 ký tự"),
  ten: z
    .string()
    .trim()
    .min(1, "Tên không được để trống")
    .max(200, "Tên tối đa 200 ký tự"),
  diaChi: z.string().max(500, "Địa chỉ tối đa 500 ký tự").optional().nullable(),
  thuKho: z.string().max(200, "Thủ kho tối đa 200 ký tự").optional().nullable(),
  moTa: z.string().max(500, "Mô tả tối đa 500 ký tự").optional().nullable(),
});

const KhoPage: React.FC = () => {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/danh-muc/kho");
  const [data, setData] = useState<Kho[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Kho | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });

  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<Kho>({
    enabled: canDelete,
    itemLabel: "kho",
    onDeleteBatch: (ids) => khoService.deleteBatch(ids),
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
      const result = await khoService.getPaginated({
        page,
        limit: pageSize,
        search: search || undefined,
      });

      if (result.data.length === 0 && page > 1 && result.meta.totalPages >= 1) {
        const newPage = Math.max(1, result.meta.totalPages);
        const newResult = await khoService.getPaginated({
          page: newPage,
          limit: pageSize,
          search: search || undefined,
        });
        setData(newResult.data);
        setPagination({
          current: newResult.meta.page,
          pageSize: newResult.meta.limit,
          total: newResult.meta.total,
        });
      } else {
        setData(result.data);
        setPagination({
          current: result.meta.page,
          pageSize: result.meta.limit,
          total: result.meta.total,
        });
      }
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

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(1, pagination.pageSize, searchText);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

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

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Kho) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const validated = khoSchema.parse(values);

      const maExists = await khoService.checkMaExists(
        validated.ma,
        editingRecord?.id
      );
      if (maExists) {
        message.error("Mã kho đã tồn tại");
        return;
      }

      if (editingRecord) {
        await khoService.update(editingRecord.id, validated);
        message.success("Cập nhật kho thành công");
      } else {
        await khoService.create(validated as Omit<Kho, "id">);
        message.success("Thêm kho thành công");
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
      await khoService.remove(id);
      message.success("Xóa kho thành công");
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch {
      message.error("Không thể xóa kho");
    }
  };

  const columns = [
    {
      title: "Mã kho",
      dataIndex: "ma",
      key: "ma",
      width: 120,
      sorter: (a: Kho, b: Kho) => a.ma.localeCompare(b.ma),
      render: (text: string) => (
        <Text strong className="text-primary">
          {text}
        </Text>
      ),
    },
    {
      title: "Tên kho",
      dataIndex: "ten",
      key: "ten",
      ellipsis: true,
      sorter: (a: Kho, b: Kho) => a.ten.localeCompare(b.ten),
    },
    {
      title: "Địa chỉ",
      dataIndex: "diaChi",
      key: "diaChi",
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text type="secondary">{text || "-"}</Text>
        </Tooltip>
      ),
    },
    {
      title: "Thủ kho",
      dataIndex: "thuKho",
      key: "thuKho",
      width: 160,
      render: (text: string) => text || "-",
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      fixed: "right" as const,
      render: (_: unknown, record: Kho) => (
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
              description="Bạn có chắc chắn muốn xóa kho này?"
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Xóa">
                <Button type="text" icon={<DeleteOutlined />} danger />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const fl = useFieldLabels('danhMuc.kho');
  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('danhMuc.kho', columns);

  return (
    <div className="space-y-3">
      <Breadcrumb
        items={[
          { href: "/", title: <HomeOutlined /> },
          { title: "Danh mục" },
          { title: "Kho" },
        ]}
      />

      <Card>
        <FilterBar
          search={{
            value: searchText,
            onChange: handleSearch,
            placeholder: "Tìm kiếm theo mã hoặc tên kho...",
            width: 400,
          }}
          actions={
            <>
              {settingsButton}
              {canExport && (
                <Button icon={<ExportOutlined />}>Xuất Excel</Button>
              )}
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchData(1, pagination.pageSize, "")}
              >
                Làm mới
              </Button>
              {bulkDeleteButton}
              {canCreate && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                >
                  Thêm kho
                </Button>
              )}
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
              `${range[0]}-${range[1]} của ${total} kho`,
            pageSizeOptions: ["25", "50", "100", "200"],
          }}
          onChange={(pag) =>
            handleTableChange({ current: pag.current, pageSize: pag.pageSize })
          }
        />
      </Card>

      <Modal
        title={editingRecord ? "Sửa kho" : "Thêm kho mới"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={550}
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small" className="mt-2">
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                name="ma"
                label={fl('ma', 'Mã kho')}
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập mã kho" },
                  { max: 20, message: "Mã tối đa 20 ký tự" },
                ]}
              >
                <Input placeholder="VD: KHO001" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="ten"
                label={fl('ten', 'Tên kho')}
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập tên kho" },
                  { max: 200, message: "Tên tối đa 200 ký tự" },
                ]}
              >
                <Input placeholder="Nhập tên kho" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="diaChi" label={fl('diaChi', 'Địa chỉ')} className="mb-3">
                <Input placeholder="Nhập địa chỉ kho" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="thuKho" label={fl('thuKho', 'Thủ kho')} className="mb-3">
                <Input placeholder="Nhập tên thủ kho" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="moTa"
            label={fl('moTa', 'Mô tả')}
            className="mb-0"
            rules={[{ max: 500, message: "Mô tả tối đa 500 ký tự" }]}
          >
            <TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="Nhập mô tả kho..."
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default KhoPage;
