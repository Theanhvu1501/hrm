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
  InputNumber,
  DatePicker,
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
import dayjs from "dayjs";
import { DiemDanhAn } from "@/types";
import { diemDanhAnService } from "@/services/diemDanhAnService";
import { congThucDinhLuongService } from "@/services/congThucDinhLuongService";
import { z } from "zod";
import { usePagePermission } from "@/hooks/usePagePermission";
import { FilterBar } from "@/components/common/FilterBar";
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';
import { useBulkDelete } from '@/components/table/useBulkDelete';

const { Text } = Typography;
const { TextArea } = Input;

const diemDanhAnSchema = z.object({
  ngay: z.string().min(1, "Vui lòng chọn ngày"),
  lopMa: z
    .string()
    .trim()
    .min(1, "Mã lớp không được để trống")
    .max(50, "Mã lớp tối đa 50 ký tự"),
  lopTen: z
    .string()
    .trim()
    .min(1, "Tên lớp không được để trống")
    .max(200, "Tên lớp tối đa 200 ký tự"),
  goiAnMa: z.string().max(50, "Gói ăn tối đa 50 ký tự").optional().nullable(),
  soTreDangKy: z.coerce.number().min(0, "Số trẻ đăng ký không được âm"),
  soTreAnThucTe: z.coerce.number().min(0, "Số trẻ ăn không được âm"),
  congThucCode: z.string().optional().nullable(),
  ghiChu: z.string().max(500, "Ghi chú tối đa 500 ký tự").optional().nullable(),
});

const DiemDanhAnPage: React.FC = () => {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/bep-an/diem-danh-an");
  const [data, setData] = useState<DiemDanhAn[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DiemDanhAn | null>(null);
  const [congThucOptions, setCongThucOptions] = useState<{ value: string; label: string }[]>([]);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });

  const fetchData = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    search = searchText
  ) => {
    setLoading(true);
    try {
      const result = await diemDanhAnService.getPaginated({
        page,
        limit: pageSize,
        search: search || undefined,
      });

      if (result.data.length === 0 && page > 1 && result.meta.totalPages >= 1) {
        const newPage = Math.max(1, result.meta.totalPages);
        const newResult = await diemDanhAnService.getPaginated({
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

  const fetchCongThucOptions = async () => {
    try {
      const list = await congThucDinhLuongService.getAll();
      setCongThucOptions(list.map((c) => ({ value: c.code, label: c.ten })));
    } catch {
      // silent — công thức là tuỳ chọn
    }
  };

  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<DiemDanhAn>({
    enabled: canDelete,
    itemLabel: "buổi điểm danh",
    onDeleteBatch: (ids) => diemDanhAnService.deleteBatch(ids),
    onDone: () => fetchData(pagination.current, pagination.pageSize, searchText),
  });

  useEffect(() => {
    fetchData(1, pagination.pageSize, "");
    fetchCongThucOptions();
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
    clearSelection();
    fetchData(
      paginationConfig.current || 1,
      paginationConfig.pageSize || 50,
      searchText
    );
  };

  const handleSearch = (value: string) => {
    clearSelection();
    setSearchText(value);
  };

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: DiemDanhAn) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      ngay: record.ngay ? dayjs(record.ngay) : undefined,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const submitData = {
        ...values,
        ngay: values.ngay ? values.ngay.format("YYYY-MM-DD") : undefined,
      };

      const validated = diemDanhAnSchema.parse(submitData);

      if (editingRecord) {
        await diemDanhAnService.update(editingRecord.id, validated);
        message.success("Cập nhật điểm danh ăn thành công");
      } else {
        await diemDanhAnService.create(validated as Omit<DiemDanhAn, "id">);
        message.success("Thêm điểm danh ăn thành công");
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
      await diemDanhAnService.remove(id);
      message.success("Xóa điểm danh ăn thành công");
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch {
      message.error("Không thể xóa điểm danh ăn");
    }
  };

  const columns = [
    {
      title: "Ngày",
      dataIndex: "ngay",
      key: "ngay",
      width: 120,
      sorter: (a: DiemDanhAn, b: DiemDanhAn) => a.ngay.localeCompare(b.ngay),
      render: (value: string) => (value ? dayjs(value).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Lớp",
      dataIndex: "lopTen",
      key: "lopTen",
      ellipsis: true,
      sorter: (a: DiemDanhAn, b: DiemDanhAn) => a.lopTen.localeCompare(b.lopTen),
      render: (text: string) => (
        <Text strong className="text-primary">
          {text}
        </Text>
      ),
    },
    {
      title: "Số trẻ đăng ký",
      dataIndex: "soTreDangKy",
      key: "soTreDangKy",
      width: 130,
      align: "right" as const,
    },
    {
      title: "Số trẻ ăn",
      dataIndex: "soTreAnThucTe",
      key: "soTreAnThucTe",
      width: 120,
      align: "right" as const,
    },
    {
      title: "Công thức",
      dataIndex: "congThucCode",
      key: "congThucCode",
      width: 140,
      render: (text: string) => text || "-",
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      fixed: "right" as const,
      render: (_: unknown, record: DiemDanhAn) => (
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
              description="Bạn có chắc chắn muốn xóa điểm danh ăn này?"
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

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('bepAn.diemDanhAn', columns);
  const fl = useFieldLabels('bepAn.diemDanhAn');

  return (
    <div className="space-y-3">
      <Breadcrumb
        items={[
          { href: "/", title: <HomeOutlined /> },
          { title: "Bếp ăn" },
          { title: "Điểm danh ăn" },
        ]}
      />

      <Card>
        <FilterBar
          search={{
            value: searchText,
            onChange: handleSearch,
            placeholder: "Tìm kiếm theo lớp...",
            width: 400,
          }}
          actions={
            <>
              {canExport && (
                <Button icon={<ExportOutlined />}>Xuất Excel</Button>
              )}
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  clearSelection();
                  fetchData(1, pagination.pageSize, "");
                }}
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
                  Thêm điểm danh
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
          loading={loading}
          rowSelection={rowSelection}
          scroll={{ x: 900, y: "calc(100vh - 285px)" }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} điểm danh`,
            pageSizeOptions: ["25", "50", "100", "200"],
          }}
          onChange={(pag) =>
            handleTableChange({ current: pag.current, pageSize: pag.pageSize })
          }
        />
      </Card>

      <Modal
        title={editingRecord ? "Sửa điểm danh ăn" : "Thêm điểm danh ăn mới"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small" className="mt-2">
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                name="ngay"
                label={fl('ngay', 'Ngày')}
                className="mb-3"
                rules={[{ required: true, message: "Vui lòng chọn ngày" }]}
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="lopMa"
                label={fl('lopMa', 'Mã lớp')}
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập mã lớp" },
                  { max: 50, message: "Mã lớp tối đa 50 ký tự" },
                ]}
              >
                <Input placeholder="VD: L01" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="lopTen"
                label={fl('lopTen', 'Tên lớp')}
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập tên lớp" },
                  { max: 200, message: "Tên lớp tối đa 200 ký tự" },
                ]}
              >
                <Input placeholder="Nhập tên lớp" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                name="soTreDangKy"
                label={fl('soTreDangKy', 'Số trẻ đăng ký')}
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập số trẻ đăng ký" },
                  { type: "number", min: 0, message: "Không được âm" },
                ]}
              >
                <InputNumber style={{ width: "100%" }} min={0} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="soTreAnThucTe"
                label={fl('soTreAnThucTe', 'Số trẻ ăn thực tế')}
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập số trẻ ăn thực tế" },
                  { type: "number", min: 0, message: "Không được âm" },
                ]}
              >
                <InputNumber style={{ width: "100%" }} min={0} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="goiAnMa"
                label={fl('goiAnMa', 'Gói ăn')}
                className="mb-3"
                rules={[{ max: 50, message: "Gói ăn tối đa 50 ký tự" }]}
              >
                <Input placeholder="Mã gói ăn" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="congThucCode"
            label={fl('congThucCode', 'Công thức định lượng')}
            className="mb-3"
          >
            <Select
              placeholder="Chọn công thức"
              allowClear
              showSearch
              optionFilterProp="label"
              options={congThucOptions}
            />
          </Form.Item>

          <Form.Item
            name="ghiChu"
            label={fl('ghiChu', 'Ghi chú')}
            className="mb-0"
            rules={[{ max: 500, message: "Ghi chú tối đa 500 ký tự" }]}
          >
            <TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="Nhập ghi chú..."
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DiemDanhAnPage;
