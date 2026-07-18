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
  Breadcrumb,
  Empty,
  Tag,
  ColorPicker,
  Select,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  HomeOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { FilterBar } from "@/components/common/FilterBar";
import { LoaiGiaoDich } from "@/types";
import { loaiGiaoDichService, LoaiGiaoDichStats } from "@/services/loaiGiaoDichService";
import { loaiChungTuService, LoaiChungTuType, PhanLoaiChungTu } from "@/services/loaiChungTuService";
import { z } from "zod";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useBulkDelete } from "@/components/table/useBulkDelete";
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';

const { Text } = Typography;
const { TextArea } = Input;

// Nhãn + màu cho phân loại của loại chứng từ liên kết
const PHAN_LOAI_TAG: Record<PhanLoaiChungTu, { label: string; color: string }> = {
  THU: { label: "Phiếu thu", color: "green" },
  CHI: { label: "Phiếu chi", color: "red" },
  KHAC: { label: "Nhật ký chung", color: "default" },
};

// Validation schema
const loaiGiaoDichSchema = z.object({
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
  color: z.string().max(50, "Màu sắc tối đa 50 ký tự").optional().nullable(),
  moTa: z.string().max(500, "Mô tả tối đa 500 ký tự").optional().nullable(),
  loaiChungTuMa: z.string().max(50, "Mã loại chứng từ tối đa 50 ký tự").optional().nullable(),
});

const LoaiGiaoDichPage: React.FC = () => {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/danh-muc/loai-giao-dich");
  const [data, setData] = useState<LoaiGiaoDich[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LoaiGiaoDich | null>(null);
  const [form] = Form.useForm();
  const [, setStats] = useState<LoaiGiaoDichStats>({ tongLoaiGiaoDich: 0 });
  const [loaiChungTuList, setLoaiChungTuList] = useState<LoaiChungTuType[]>([]);
  const loaiChungTuMap = React.useMemo(
    () => new Map(loaiChungTuList.map((l) => [l.ma, l])),
    [loaiChungTuList]
  );
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });

  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<LoaiGiaoDich>({
    enabled: canDelete,
    itemLabel: "loại giao dịch",
    onDeleteBatch: (ids) => loaiGiaoDichService.deleteBatch(ids),
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
      const [result, statsData] = await Promise.all([
        loaiGiaoDichService.getPaginated({
          page,
          limit: pageSize,
          search: search || undefined,
        }),
        loaiGiaoDichService.getStats(),
      ]);
      setData(result.data);
      setPagination({
        current: result.meta.page,
        pageSize: result.meta.limit,
        total: result.meta.total,
      });
      setStats(statsData);
    } catch (error) {
      message.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, pagination.pageSize, "");
    loaiChungTuService
      .getAll()
      .then(setLoaiChungTuList)
      .catch(() => setLoaiChungTuList([]));
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

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: LoaiGiaoDich) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Convert color object to string if needed
      if (values.color && typeof values.color === 'object') {
        values.color = values.color.toHexString?.() || values.color;
      }

      // Validate with zod
      const validated = loaiGiaoDichSchema.parse(values);

      // Check if ma already exists
      const maExists = await loaiGiaoDichService.checkMaExists(
        validated.ma,
        editingRecord?.id
      );
      if (maExists) {
        message.error("Mã loại giao dịch đã tồn tại");
        return;
      }

      if (editingRecord) {
        await loaiGiaoDichService.update(editingRecord.id, validated);
        message.success("Cập nhật loại giao dịch thành công");
      } else {
        await loaiGiaoDichService.create(validated as Omit<LoaiGiaoDich, "id">);
        message.success("Thêm loại giao dịch thành công");
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
      await loaiGiaoDichService.remove(id);
      message.success("Xóa loại giao dịch thành công");
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch (error) {
      message.error("Không thể xóa loại giao dịch");
    }
  };

  const getColorTag = (color?: string) => {
    if (!color) return <Text type="secondary">-</Text>;
    return (
      <Tag color={color} style={{ minWidth: 80, textAlign: 'center' }}>
        {color}
      </Tag>
    );
  };

  const columns = [
    {
      title: "Mã",
      dataIndex: "ma",
      key: "ma",
      width: 150,
      sorter: (a: LoaiGiaoDich, b: LoaiGiaoDich) => a.ma.localeCompare(b.ma),
      render: (text: string) => (
        <Text strong className="text-primary">
          {text}
        </Text>
      ),
    },
    {
      title: "Tên loại giao dịch",
      dataIndex: "ten",
      key: "ten",
      sorter: (a: LoaiGiaoDich, b: LoaiGiaoDich) => a.ten.localeCompare(b.ten),
      render: (text: string) => (
        <Space>
          <SwapOutlined className="text-muted-foreground" />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: "Loại chứng từ → Phân hệ",
      dataIndex: "loaiChungTuMa",
      key: "loaiChungTuMa",
      width: 240,
      render: (ma?: string) => {
        if (!ma) return <Text type="secondary">Chưa gán</Text>;
        const lct = loaiChungTuMap.get(ma);
        if (!lct) return <Text type="warning">{ma} (không tồn tại)</Text>;
        const tag = PHAN_LOAI_TAG[lct.phanLoai ?? "KHAC"];
        return (
          <Space size={4}>
            <Text>{lct.ten}</Text>
            <Tag color={tag.color}>{tag.label}</Tag>
          </Space>
        );
      },
    },
    {
      title: "Màu sắc",
      dataIndex: "color",
      key: "color",
      width: 120,
      render: (color: string) => getColorTag(color),
    },
    {
      title: "Mô tả",
      dataIndex: "moTa",
      key: "moTa",
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text type="secondary">{text || "-"}</Text>
        </Tooltip>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      fixed: "right" as const,
      render: (_: unknown, record: LoaiGiaoDich) => (
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
            description="Bạn có chắc chắn muốn xóa loại giao dịch này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" icon={<DeleteOutlined />} danger />
          </Popconfirm>)}
        </Space>
      ),
    },
  ];

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('danhMuc.loaiGiaoDich', columns);
  const fl = useFieldLabels('danhMuc.loaiGiaoDich');

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { href: "/", title: <HomeOutlined /> },
          { title: "Danh mục" },
          { title: "Loại giao dịch" },
        ]}
      />

      {/* Table */}
      <Card>
        <FilterBar
          search={{
            value: searchText,
            onChange: setSearchText,
            onSearch: () => fetchData(1, pagination.pageSize, searchText),
            placeholder: "Tìm kiếm theo mã hoặc tên loại giao dịch...",
            width: 400,
          }}
          onReset={() => {
            setSearchText("");
            fetchData(1, pagination.pageSize, "");
          }}
          actions={
            <>
              {settingsButton}
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
                  Thêm loại giao dịch
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
          scroll={{
            y: "calc(100vh - 285px)",
          }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} loại giao dịch`,
            pageSizeOptions: ["25", "50", "100", "200"],
          }}
          onChange={(pag) =>
            handleTableChange({ current: pag.current, pageSize: pag.pageSize })
          }
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có loại giao dịch nào"
              />
            ),
          }}
        />
      </Card>

      {/* Modal */}
      <Modal
        title={editingRecord ? "Sửa loại giao dịch" : "Thêm loại giao dịch mới"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-2" size="small">
          <Form.Item
            name="ma"
            label={fl('ma', 'Mã loại giao dịch')}
            rules={[
              { required: true, message: "Vui lòng nhập mã loại giao dịch" },
              { max: 50, message: "Mã tối đa 50 ký tự" },
            ]}
            className="mb-3"
          >
            <Input placeholder="VD: PHIEU_THU, PHIEU_CHI, BAO_CO, BAO_NO" />
          </Form.Item>

          <Form.Item
            name="ten"
            label={fl('ten', 'Tên loại giao dịch')}
            rules={[
              { required: true, message: "Vui lòng nhập tên loại giao dịch" },
              { max: 200, message: "Tên tối đa 200 ký tự" },
            ]}
            className="mb-3"
          >
            <Input placeholder="VD: Phiếu thu, Phiếu chi, Báo có ngân hàng..." />
          </Form.Item>

          <Form.Item
            name="loaiChungTuMa"
            label={fl('loaiChungTuMa', 'Loại chứng từ (quyết định Phiếu thu/chi/NKC)')}
            tooltip="Chứng từ dùng loại giao dịch này sẽ vào phân hệ theo phân loại của Loại chứng từ được chọn"
            className="mb-3"
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Chọn loại chứng từ liên kết"
              options={loaiChungTuList.map((l) => ({
                value: l.ma,
                label: `${l.ten} — ${PHAN_LOAI_TAG[l.phanLoai ?? "KHAC"].label}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="color"
            label={fl('color', 'Màu sắc')}
            rules={[{ max: 50, message: "Màu sắc tối đa 50 ký tự" }]}
            className="mb-3"
          >
            <Input placeholder="VD: green, red, blue, orange, #1890ff" />
          </Form.Item>

          <Form.Item
            name="moTa"
            label={fl('moTa', 'Mô tả')}
            rules={[{ max: 500, message: "Mô tả tối đa 500 ký tự" }]}
            className="mb-0"
          >
            <TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="Nhập mô tả cho loại giao dịch..."
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LoaiGiaoDichPage;
