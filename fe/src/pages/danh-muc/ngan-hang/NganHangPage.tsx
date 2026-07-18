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
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { TaiKhoanNganHang } from "@/types";
import { FilterBar } from "@/components/common/FilterBar";
import { nganHangService } from "@/services/nganHangService";
import { z } from "zod";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useBulkDelete } from "@/components/table/useBulkDelete";
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';

const { Text } = Typography;

// Validation schema
const taiKhoanNHSchema = z.object({
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
  soTaiKhoan: z
    .string()
    .max(30, "Số tài khoản tối đa 30 ký tự")
    .optional()
    .nullable(),
  nganHang: z.string().optional().nullable(),
  chiNhanh: z
    .string()
    .max(200, "Tên chi nhánh tối đa 200 ký tự")
    .optional()
    .nullable(),
  chuTaiKhoan: z
    .string()
    .max(200, "Chủ tài khoản tối đa 200 ký tự")
    .optional()
    .nullable(),
  trangThai: z.boolean(),
});

const NganHangPage: React.FC = () => {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission(
    "/danh-muc/ngan-hang"
  );
  const [data, setData] = useState<TaiKhoanNganHang[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TaiKhoanNganHang | null>(
    null
  );
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });

  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<TaiKhoanNganHang>({
    enabled: canDelete,
    itemLabel: "ngân hàng",
    onDeleteBatch: (ids) => nganHangService.deleteBatch(ids),
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
      const result = await nganHangService.getPaginated({
        page,
        limit: pageSize,
        search: search || undefined,
        loai: "NGAN_HANG",
      });
      setData(result.data);
      setPagination({
        current: result.meta.page,
        pageSize: result.meta.limit,
        total: result.meta.total,
      });
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
      paginationConfig.pageSize || 10,
      searchText
    );
  };

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ trangThai: true });
    setModalVisible(true);
  };

  const handleEdit = (record: TaiKhoanNganHang) => {
    setEditingRecord(record);
    form.setFieldsValue({ trangThai: true, ...record });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Validate with zod
      const validated = taiKhoanNHSchema.parse(values);

      // Check if ma already exists
      const maExists = await nganHangService.checkMaExists(
        validated.ma,
        editingRecord?.id
      );
      if (maExists) {
        message.error("Mã tài khoản đã tồn tại");
        return;
      }

      const payload = {
        ...validated,
        loai: "NGAN_HANG" as const,
        soDu: editingRecord?.soDu ?? 0,
      };

      if (editingRecord) {
        await nganHangService.update(editingRecord.id, payload);
        message.success("Cập nhật tài khoản thành công");
      } else {
        await nganHangService.create(
          payload as Omit<TaiKhoanNganHang, "id">
        );
        message.success("Thêm tài khoản thành công");
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
      await nganHangService.remove(id);
      message.success("Xóa tài khoản thành công");
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch (error) {
      message.error("Không thể xóa tài khoản");
    }
  };

  const columns = [
    {
      title: "Số tài khoản",
      dataIndex: "soTaiKhoan",
      key: "soTaiKhoan",
      width: 180,
      sorter: (a: TaiKhoanNganHang, b: TaiKhoanNganHang) =>
        (a.soTaiKhoan || "").localeCompare(b.soTaiKhoan || ""),
      render: (text: string) =>
        text ? (
          <Text strong className="text-primary">
            {text}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: "Tên ngân hàng",
      dataIndex: "nganHang",
      key: "nganHang",
      ellipsis: true,
      sorter: (a: TaiKhoanNganHang, b: TaiKhoanNganHang) =>
        (a.nganHang || "").localeCompare(b.nganHang || ""),
      render: (text: string) => <Text>{text || "-"}</Text>,
    },
    {
      title: "Tên chi nhánh ngân hàng",
      dataIndex: "chiNhanh",
      key: "chiNhanh",
      ellipsis: true,
      render: (text: string) =>
        text ? <Text>{text}</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: "Chủ tài khoản",
      dataIndex: "chuTaiKhoan",
      key: "chuTaiKhoan",
      ellipsis: true,
      render: (text: string) =>
        text ? <Text>{text}</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: "Trạng thái",
      dataIndex: "trangThai",
      key: "trangThai",
      width: 140,
      render: (trangThai: boolean) =>
        trangThai === false ? (
          <Tag color="default">Ngừng sử dụng</Tag>
        ) : (
          <Tag color="green">Đang sử dụng</Tag>
        ),
    },
    {
      title: "Chức năng",
      key: "actions",
      width: 110,
      fixed: "right" as const,
      render: (_: unknown, record: TaiKhoanNganHang) => (
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
              description="Bạn có chắc chắn muốn xóa tài khoản này?"
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

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('danhMuc.nganHang', columns);
  const fl = useFieldLabels('danhMuc.nganHang');

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { href: "/", title: <HomeOutlined /> },
          { title: "Danh mục" },
          { title: "Ngân hàng & Quỹ" },
        ]}
      />

      {/* Table */}
      <Card>
        <FilterBar
          search={{
            value: searchText,
            onChange: setSearchText,
            onSearch: () => fetchData(1, pagination.pageSize, searchText),
            placeholder: "Tìm kiếm theo số tài khoản, tên ngân hàng, chi nhánh...",
            width: 300,
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
                  Thêm tài khoản
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
          scroll={{ x: 1000, y: "calc(100vh - 285px)" }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} tài khoản`,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          onChange={(pag) =>
            handleTableChange({ current: pag.current, pageSize: pag.pageSize })
          }
        />
      </Card>

      {/* Modal */}
      <Modal
        title={editingRecord ? "Sửa tài khoản" : "Thêm tài khoản mới"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={560}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          size="small"
          className="mt-2"
          initialValues={{ trangThai: true }}
        >
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="ma"
                label={fl('ma', 'Mã tài khoản')}
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập mã" },
                  { max: 20, message: "Mã tối đa 20 ký tự" },
                ]}
              >
                <Input placeholder="VD: NH001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="soTaiKhoan"
                label={fl('soTaiKhoan', 'Số tài khoản')}
                className="mb-3"
                rules={[{ max: 30, message: "Số TK tối đa 30 ký tự" }]}
              >
                <Input placeholder="Nhập số tài khoản" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="ten"
            label={fl('ten', 'Tên tài khoản')}
            className="mb-3"
            rules={[
              { required: true, message: "Vui lòng nhập tên tài khoản" },
              { max: 200, message: "Tên tối đa 200 ký tự" },
            ]}
          >
            <Input placeholder="Nhập tên tài khoản" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="nganHang"
                label={fl('nganHang', 'Tên ngân hàng')}
                className="mb-3"
                rules={[{ max: 200, message: "Tên ngân hàng tối đa 200 ký tự" }]}
              >
                <Input placeholder="VD: Ngân hàng TMCP An Bình" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="chiNhanh"
                label={fl('chiNhanh', 'Tên chi nhánh ngân hàng')}
                className="mb-3"
                rules={[{ max: 200, message: "Tên chi nhánh tối đa 200 ký tự" }]}
              >
                <Input placeholder="Nhập tên chi nhánh" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="chuTaiKhoan"
                label={fl('chuTaiKhoan', 'Chủ tài khoản')}
                className="mb-0"
                rules={[{ max: 200, message: "Chủ tài khoản tối đa 200 ký tự" }]}
              >
                <Input placeholder="Nhập chủ tài khoản" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="trangThai"
                label={fl('trangThai', 'Trạng thái')}
                className="mb-0"
                rules={[{ required: true, message: "Vui lòng chọn trạng thái" }]}
              >
                <Select
                  options={[
                    { value: true, label: "Đang sử dụng" },
                    { value: false, label: "Ngừng sử dụng" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default NganHangPage;
