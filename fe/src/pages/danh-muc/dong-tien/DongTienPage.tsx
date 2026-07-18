import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  Select,
  message,
  Popconfirm,
  Tooltip,
  Typography,
  Row,
  Col,
  Breadcrumb,
  Statistic,
  Tag,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ReloadOutlined,
  HomeOutlined,
  DollarOutlined,
  BankOutlined,
  LineChartOutlined,
  FundOutlined,
} from "@ant-design/icons";
import { DongTien } from "@/types";
import { dongTienService, DongTienStats } from "@/services/dongTienService";
import { loaiDongTienOptions } from "@/mock-data/dong-tien";
import { z } from "zod";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useBulkDelete } from "@/components/table/useBulkDelete";
import { FilterBar } from "@/components/common/FilterBar";
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';

const { Text } = Typography;
const { TextArea } = Input;

// Validation schema
const dongTienSchema = z.object({
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
  loai: z.enum(["KINH_DOANH", "DAU_TU", "TAI_CHINH"], {
    required_error: "Vui lòng chọn loại",
  }),
  moTa: z.string().max(500, "Mô tả tối đa 500 ký tự").optional().nullable(),
});

const DongTienPage: React.FC = () => {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/danh-muc/dong-tien");
  const [data, setData] = useState<DongTien[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DongTien | null>(null);
  const [form] = Form.useForm();
  const [stats, setStats] = useState<DongTienStats>({
    tongSo: 0,
    kinhDoanh: 0,
    dauTu: 0,
    taiChinh: 0,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });

  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<DongTien>({
    enabled: canDelete,
    itemLabel: "dòng tiền",
    onDeleteBatch: (ids) => dongTienService.deleteBatch(ids),
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
        dongTienService.getPaginated({
          page,
          limit: pageSize,
          search: search || undefined,
        }),
        dongTienService.getStats(),
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

  const handleEdit = (record: DongTien) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Validate with zod
      const validated = dongTienSchema.parse(values);

      // Check if ma already exists
      const maExists = await dongTienService.checkMaExists(
        validated.ma,
        editingRecord?.id
      );
      if (maExists) {
        message.error("Mã dòng tiền đã tồn tại");
        return;
      }

      if (editingRecord) {
        await dongTienService.update(editingRecord.id, validated);
        message.success("Cập nhật dòng tiền thành công");
      } else {
        await dongTienService.create(validated as Omit<DongTien, "id">);
        message.success("Thêm dòng tiền thành công");
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
      await dongTienService.remove(id);
      message.success("Xóa dòng tiền thành công");
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch (error) {
      message.error("Không thể xóa dòng tiền");
    }
  };

  const getLoaiInfo = (loai: string) => {
    const info = loaiDongTienOptions.find((o) => o.value === loai);
    return info || { label: loai, color: "default" };
  };

  const columns = [
    {
      title: "Mã",
      dataIndex: "ma",
      key: "ma",
      width: 100,
      sorter: (a: DongTien, b: DongTien) => a.ma.localeCompare(b.ma),
      render: (text: string) => (
        <Text strong className="text-primary">
          {text}
        </Text>
      ),
    },
    {
      title: "Tên dòng tiền",
      dataIndex: "ten",
      key: "ten",
      ellipsis: true,
      sorter: (a: DongTien, b: DongTien) => a.ten.localeCompare(b.ten),
    },
    {
      title: "Loại hoạt động",
      dataIndex: "loai",
      key: "loai",
      width: 180,
      filters: loaiDongTienOptions.map((o) => ({
        text: o.label,
        value: o.value,
      })),
      onFilter: (value: any, record: DongTien) => record.loai === value,
      render: (loai: string) => {
        const info = getLoaiInfo(loai);
        return <Tag color={info.color}>{info.label}</Tag>;
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
      render: (_: unknown, record: DongTien) => (
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
            description="Bạn có chắc chắn muốn xóa dòng tiền này?"
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

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('danhMuc.dongTien', columns);
  const fl = useFieldLabels('danhMuc.dongTien');

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { href: "/", title: <HomeOutlined /> },
          { title: "Danh mục" },
          { title: "Dòng tiền" },
        ]}
      />

      {/* Stats Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <Card className="stat-card">
            <Statistic
              title="Tổng số"
              value={stats.tongSo}
              prefix={<DollarOutlined className="text-primary" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="stat-card">
            <Statistic
              title="Kinh doanh"
              value={stats.kinhDoanh}
              prefix={<LineChartOutlined className="text-blue-500" />}
              valueStyle={{ color: "#3b82f6" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="stat-card">
            <Statistic
              title="Đầu tư"
              value={stats.dauTu}
              prefix={<FundOutlined className="text-green-500" />}
              valueStyle={{ color: "#22c55e" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="stat-card">
            <Statistic
              title="Tài chính"
              value={stats.taiChinh}
              prefix={<BankOutlined className="text-purple-500" />}
              valueStyle={{ color: "#a855f7" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <FilterBar
          search={{
            value: searchText,
            onChange: handleSearch,
            onSearch: () => fetchData(1, pagination.pageSize, searchText),
            placeholder: "Tìm kiếm theo mã hoặc tên...",
            width: 300,
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
                  Thêm dòng tiền
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
              `${range[0]}-${range[1]} của ${total} dòng tiền`,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          onChange={(pag) =>
            handleTableChange({ current: pag.current, pageSize: pag.pageSize })
          }
        />
      </Card>

      {/* Modal */}
      <Modal
        title={editingRecord ? "Sửa dòng tiền" : "Thêm dòng tiền mới"}
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
                label={fl('ma', 'Mã dòng tiền')}
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập mã" },
                  { max: 20, message: "Mã tối đa 20 ký tự" },
                ]}
              >
                <Input placeholder="VD: DT001" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="ten"
                label={fl('ten', 'Tên dòng tiền')}
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập tên" },
                  { max: 200, message: "Tên tối đa 200 ký tự" },
                ]}
              >
                <Input placeholder="Nhập tên dòng tiền" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="loai"
            label={fl('loai', 'Loại hoạt động')}
            className="mb-3"
            rules={[
              { required: true, message: "Vui lòng chọn loại hoạt động" },
            ]}
          >
            <Select
              placeholder="Chọn loại hoạt động"
              options={loaiDongTienOptions.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
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

export default DongTienPage;
