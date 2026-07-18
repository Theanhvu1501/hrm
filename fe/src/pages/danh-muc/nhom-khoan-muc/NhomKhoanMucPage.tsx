import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Tag,
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
  Tabs,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  HomeOutlined,
  FallOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import { nhomKhoanMucService, NhomKhoanMuc, NhomKhoanMucStats } from "@/services/nhomKhoanMucService";
import { FilterBar } from "@/components/common/FilterBar";
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';
import { z } from "zod";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useBulkDelete } from "@/components/table/useBulkDelete";

const { Text } = Typography;

const loaiOptions = [
  { value: 'CHI_PHI', label: 'Chi phí', color: 'red' },
  { value: 'DOANH_THU', label: 'Doanh thu', color: 'green' },
];

const nhomKhoanMucSchema = z.object({
  ma: z.string().trim().min(1, "Mã không được để trống").max(20, "Mã tối đa 20 ký tự"),
  ten: z.string().trim().min(1, "Tên không được để trống").max(200, "Tên tối đa 200 ký tự"),
  loai: z.enum(["CHI_PHI", "DOANH_THU"]),
  moTa: z.string().max(500, "Mô tả tối đa 500 ký tự").optional().nullable(),
});

const NhomKhoanMucPage: React.FC = () => {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/danh-muc/nhom-khoan-muc");
  const [data, setData] = useState<NhomKhoanMuc[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<NhomKhoanMuc | null>(null);
  const [form] = Form.useForm();
  const [stats, setStats] = useState<NhomKhoanMucStats>({ tongNhomKhoanMuc: 0, chiPhi: 0, doanhThu: 0 });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });

  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<NhomKhoanMuc>({
    enabled: canDelete,
    itemLabel: "nhóm khoản mục",
    onDeleteBatch: (ids) => nhomKhoanMucService.deleteBatch(ids),
    onDone: () => fetchData(),
  });

  const fetchData = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    search = searchText,
    loai?: 'CHI_PHI' | 'DOANH_THU'
  ) => {
    // Lựa chọn chỉ có hiệu lực trong trang đang xem: đổi trang / tìm kiếm / lọc / tải lại đều bỏ chọn.
    clearSelection();
    setLoading(true);
    try {
      const [result, statsData] = await Promise.all([
        nhomKhoanMucService.getPaginated({ page, limit: pageSize, search: search || undefined, loai }),
        nhomKhoanMucService.getStats(),
      ]);
      setData(result.data);
      setPagination({ current: result.meta.page, pageSize: result.meta.limit, total: result.meta.total });
      setStats(statsData);
    } catch (error) {
      message.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, pagination.pageSize, "", activeTab === "all" ? undefined : (activeTab as 'CHI_PHI' | 'DOANH_THU'));
  }, []);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setSearchText("");
    fetchData(1, pagination.pageSize, "", key === "all" ? undefined : (key as 'CHI_PHI' | 'DOANH_THU'));
  };

  const handleTableChange = (paginationConfig: { current?: number; pageSize?: number }) => {
    fetchData(
      paginationConfig.current || 1,
      paginationConfig.pageSize || 50,
      searchText,
      activeTab === "all" ? undefined : (activeTab as 'CHI_PHI' | 'DOANH_THU')
    );
  };

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ loai: "CHI_PHI" });
    setModalVisible(true);
  };

  const handleEdit = (record: NhomKhoanMuc) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const validated = nhomKhoanMucSchema.parse(values);

      const maExists = await nhomKhoanMucService.checkMaExists(validated.ma, editingRecord?.id);
      if (maExists) {
        message.error("Mã nhóm khoản mục đã tồn tại");
        return;
      }

      if (editingRecord) {
        await nhomKhoanMucService.update(editingRecord.id, validated);
        message.success("Cập nhật nhóm khoản mục thành công");
      } else {
        await nhomKhoanMucService.create(validated as Omit<NhomKhoanMuc, "id" | "isActive">);
        message.success("Thêm nhóm khoản mục thành công");
      }

      setModalVisible(false);
      fetchData(pagination.current, pagination.pageSize, searchText, activeTab === "all" ? undefined : (activeTab as 'CHI_PHI' | 'DOANH_THU'));
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
      await nhomKhoanMucService.remove(id);
      message.success("Xóa nhóm khoản mục thành công");
      fetchData(pagination.current, pagination.pageSize, searchText, activeTab === "all" ? undefined : (activeTab as 'CHI_PHI' | 'DOANH_THU'));
    } catch (error) {
      message.error("Không thể xóa nhóm khoản mục");
    }
  };

  const getLoaiTag = (loai: 'CHI_PHI' | 'DOANH_THU') => {
    const option = loaiOptions.find((o) => o.value === loai);
    const icon = loai === "CHI_PHI" ? <FallOutlined /> : <RiseOutlined />;
    return <Tag color={option?.color} icon={icon}>{option?.label}</Tag>;
  };

  const columns = [
    {
      title: "Mã",
      dataIndex: "ma",
      key: "ma",
      width: 120,
      sorter: (a: NhomKhoanMuc, b: NhomKhoanMuc) => a.ma.localeCompare(b.ma),
      render: (text: string) => <Text strong className="text-primary">{text}</Text>,
    },
    {
      title: "Tên nhóm khoản mục",
      dataIndex: "ten",
      key: "ten",
      ellipsis: true,
      sorter: (a: NhomKhoanMuc, b: NhomKhoanMuc) => a.ten.localeCompare(b.ten),
    },
    {
      title: "Loại",
      dataIndex: "loai",
      key: "loai",
      width: 130,
      render: (loai: 'CHI_PHI' | 'DOANH_THU') => getLoaiTag(loai),
    },
    {
      title: "Mô tả",
      dataIndex: "moTa",
      key: "moTa",
      ellipsis: true,
      render: (moTa: string) => <Text type="secondary">{moTa || "-"}</Text>,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 100,
      fixed: "right" as const,
      render: (_: unknown, record: NhomKhoanMuc) => (
        <Space size="small">
          {canEdit && (<Tooltip title="Sửa">
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} className="text-primary" />
          </Tooltip>)}
          {canDelete && (<Popconfirm
            title="Xác nhận xóa"
            description="Bạn có chắc chắn muốn xóa nhóm khoản mục này?"
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

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('danhMuc.nhomKhoanMuc', columns);
  const fl = useFieldLabels('danhMuc.nhomKhoanMuc');

  const tabItems = [
    { key: "all", label: <span>Tất cả <Tag className="ml-1">{stats.tongNhomKhoanMuc}</Tag></span> },
    { key: "CHI_PHI", label: <span><FallOutlined className="mr-1" />Chi phí <Tag color="red" className="ml-1">{stats.chiPhi}</Tag></span> },
    { key: "DOANH_THU", label: <span><RiseOutlined className="mr-1" />Doanh thu <Tag color="green" className="ml-1">{stats.doanhThu}</Tag></span> },
  ];

  return (
    <div className="space-y-3">
      <Breadcrumb items={[{ href: "/", title: <HomeOutlined /> }, { title: "Danh mục" }, { title: "Nhóm khoản mục" }]} />

      <Card>
        <Tabs activeKey={activeTab} onChange={handleTabChange} items={tabItems} className="mb-4" />

        <FilterBar
          search={{
            value: searchText,
            onChange: setSearchText,
            onSearch: () => fetchData(1, pagination.pageSize, searchText, activeTab === "all" ? undefined : (activeTab as 'CHI_PHI' | 'DOANH_THU')),
            placeholder: "Tìm kiếm theo mã hoặc tên...",
            width: 300,
          }}
          onReset={() => {
            setSearchText("");
            fetchData(1, pagination.pageSize, "", activeTab === "all" ? undefined : (activeTab as 'CHI_PHI' | 'DOANH_THU'));
          }}
          actions={
            <>
              {settingsButton}
              {canExport && (
                <Button icon={<ExportOutlined />}>Xuất Excel</Button>
              )}
              {bulkDeleteButton}
              {canCreate && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                  Thêm nhóm
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
          scroll={{ x: 800, y: "calc(100vh - 350px)" }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} nhóm khoản mục`,
            pageSizeOptions: ["25", "50", "100", "200"],
          }}
          onChange={(pag) => handleTableChange({ current: pag.current, pageSize: pag.pageSize })}
        />
      </Card>

      <Modal
        title={editingRecord ? "Sửa nhóm khoản mục" : "Thêm nhóm khoản mục mới"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small" className="mt-2">
          <Row gutter={12}>
            <Col span={10}>
              <Form.Item name="ma" label={fl('ma', 'Mã nhóm')} className="mb-3" rules={[{ required: true, message: "Vui lòng nhập mã" }, { max: 20, message: "Mã tối đa 20 ký tự" }]}>
                <Input placeholder="VD: NCP001" />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item name="loai" label={fl('loai', 'Loại')} className="mb-3" rules={[{ required: true, message: "Vui lòng chọn loại" }]}>
                <Select
                  placeholder="Chọn loại"
                  options={loaiOptions.map((o) => ({
                    value: o.value,
                    label: <Tag color={o.color}>{o.value === "CHI_PHI" ? <FallOutlined /> : <RiseOutlined />} {o.label}</Tag>,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="ten" label={fl('ten', 'Tên nhóm khoản mục')} className="mb-3" rules={[{ required: true, message: "Vui lòng nhập tên" }, { max: 200, message: "Tên tối đa 200 ký tự" }]}>
            <Input placeholder="Nhập tên nhóm khoản mục" />
          </Form.Item>
          <Form.Item name="moTa" label={fl('moTa', 'Mô tả')} className="mb-0" rules={[{ max: 500, message: "Mô tả tối đa 500 ký tự" }]}>
            <Input.TextArea rows={3} placeholder="Mô tả chi tiết (tùy chọn)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NhomKhoanMucPage;
