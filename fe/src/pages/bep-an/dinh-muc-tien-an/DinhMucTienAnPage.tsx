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
import { DinhMucTienAn, PhamViDinhMuc } from "@/types";
import { dinhMucTienAnService } from "@/services/dinhMucTienAnService";
import { z } from "zod";
import { usePagePermission } from "@/hooks/usePagePermission";
import { FilterBar } from "@/components/common/FilterBar";
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';
import { useBulkDelete } from '@/components/table/useBulkDelete';

const { Text } = Typography;

const phamViOptions: { value: PhamViDinhMuc; label: string }[] = [
  { value: "LOP", label: "Theo lớp" },
  { value: "DO_TUOI", label: "Theo độ tuổi" },
  { value: "GOI_AN", label: "Theo gói ăn" },
  { value: "CHUNG", label: "Chung" },
];

const dinhMucTienAnSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Mã không được để trống")
    .max(20, "Mã tối đa 20 ký tự"),
  ten: z
    .string()
    .trim()
    .min(1, "Tên không được để trống")
    .max(200, "Tên tối đa 200 ký tự"),
  phamVi: z.enum(["LOP", "DO_TUOI", "GOI_AN", "CHUNG"]).optional(),
  doiTuongMa: z.string().max(50, "Đối tượng tối đa 50 ký tự").optional().nullable(),
  mucTien: z.coerce.number().min(0, "Mức tiền không được âm"),
  hieuLucTu: z.string().optional(),
  hieuLucDen: z.string().optional(),
});

const DinhMucTienAnPage: React.FC = () => {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/bep-an/dinh-muc-tien-an");
  const [data, setData] = useState<DinhMucTienAn[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DinhMucTienAn | null>(null);
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
      const result = await dinhMucTienAnService.getPaginated({
        page,
        limit: pageSize,
        search: search || undefined,
      });

      if (result.data.length === 0 && page > 1 && result.meta.totalPages >= 1) {
        const newPage = Math.max(1, result.meta.totalPages);
        const newResult = await dinhMucTienAnService.getPaginated({
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

  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<DinhMucTienAn>({
    enabled: canDelete,
    itemLabel: "định mức",
    onDeleteBatch: (ids) => dinhMucTienAnService.deleteBatch(ids),
    onDone: () => fetchData(pagination.current, pagination.pageSize, searchText),
  });

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

  const handleEdit = (record: DinhMucTienAn) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      hieuLucTu: record.hieuLucTu ? dayjs(record.hieuLucTu) : undefined,
      hieuLucDen: record.hieuLucDen ? dayjs(record.hieuLucDen) : undefined,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const submitData = {
        ...values,
        hieuLucTu: values.hieuLucTu ? values.hieuLucTu.format("YYYY-MM-DD") : undefined,
        hieuLucDen: values.hieuLucDen ? values.hieuLucDen.format("YYYY-MM-DD") : undefined,
      };

      const validated = dinhMucTienAnSchema.parse(submitData);

      const codeExists = await dinhMucTienAnService.checkCodeExists(
        validated.code,
        editingRecord?.id
      );
      if (codeExists) {
        message.error("Mã định mức tiền ăn đã tồn tại");
        return;
      }

      if (editingRecord) {
        await dinhMucTienAnService.update(editingRecord.id, validated);
        message.success("Cập nhật định mức tiền ăn thành công");
      } else {
        await dinhMucTienAnService.create(validated as Omit<DinhMucTienAn, "id">);
        message.success("Thêm định mức tiền ăn thành công");
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
      await dinhMucTienAnService.remove(id);
      message.success("Xóa định mức tiền ăn thành công");
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch {
      message.error("Không thể xóa định mức tiền ăn");
    }
  };

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return "-";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const getPhamViLabel = (value?: PhamViDinhMuc) =>
    phamViOptions.find((o) => o.value === value)?.label || "-";

  const columns = [
    {
      title: "Mã",
      dataIndex: "code",
      key: "code",
      width: 120,
      sorter: (a: DinhMucTienAn, b: DinhMucTienAn) => a.code.localeCompare(b.code),
      render: (text: string) => (
        <Text strong className="text-primary">
          {text}
        </Text>
      ),
    },
    {
      title: "Tên định mức",
      dataIndex: "ten",
      key: "ten",
      ellipsis: true,
      sorter: (a: DinhMucTienAn, b: DinhMucTienAn) => a.ten.localeCompare(b.ten),
    },
    {
      title: "Phạm vi",
      dataIndex: "phamVi",
      key: "phamVi",
      width: 130,
      render: (value: PhamViDinhMuc) => getPhamViLabel(value),
    },
    {
      title: "Đối tượng",
      dataIndex: "doiTuongMa",
      key: "doiTuongMa",
      width: 140,
      render: (text: string) => text || "-",
    },
    {
      title: "Mức tiền",
      dataIndex: "mucTien",
      key: "mucTien",
      width: 150,
      align: "right" as const,
      render: (value: number) => formatCurrency(value),
    },
    {
      title: "Hiệu lực từ",
      dataIndex: "hieuLucTu",
      key: "hieuLucTu",
      width: 120,
      render: (value: string) => (value ? dayjs(value).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      fixed: "right" as const,
      render: (_: unknown, record: DinhMucTienAn) => (
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
              description="Bạn có chắc chắn muốn xóa định mức tiền ăn này?"
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

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('bepAn.dinhMucTienAn', columns);
  const fl = useFieldLabels('bepAn.dinhMucTienAn');

  return (
    <div className="space-y-3">
      <Breadcrumb
        items={[
          { href: "/", title: <HomeOutlined /> },
          { title: "Bếp ăn" },
          { title: "Định mức tiền ăn" },
        ]}
      />

      <Card>
        <FilterBar
          search={{
            value: searchText,
            onChange: handleSearch,
            placeholder: "Tìm kiếm theo mã hoặc tên định mức...",
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
                  Thêm định mức
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
              `${range[0]}-${range[1]} của ${total} định mức`,
            pageSizeOptions: ["25", "50", "100", "200"],
          }}
          onChange={(pag) =>
            handleTableChange({ current: pag.current, pageSize: pag.pageSize })
          }
        />
      </Card>

      <Modal
        title={editingRecord ? "Sửa định mức tiền ăn" : "Thêm định mức tiền ăn mới"}
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
                name="code"
                label={fl('code', 'Mã')}
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập mã" },
                  { max: 20, message: "Mã tối đa 20 ký tự" },
                ]}
              >
                <Input placeholder="VD: DM01" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="ten"
                label={fl('ten', 'Tên định mức')}
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập tên định mức" },
                  { max: 200, message: "Tên tối đa 200 ký tự" },
                ]}
              >
                <Input placeholder="Nhập tên định mức" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="phamVi"
                label={fl('phamVi', 'Phạm vi')}
                className="mb-3"
              >
                <Select
                  placeholder="Chọn phạm vi"
                  allowClear
                  options={phamViOptions}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="doiTuongMa"
                label={fl('doiTuongMa', 'Đối tượng')}
                className="mb-3"
                rules={[{ max: 50, message: "Đối tượng tối đa 50 ký tự" }]}
              >
                <Input placeholder="VD: Mã lớp / độ tuổi / gói ăn" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="mucTien"
            label={fl('mucTien', 'Mức tiền (VNĐ)')}
            className="mb-3"
            rules={[
              { required: true, message: "Vui lòng nhập mức tiền" },
              { type: "number", min: 0, message: "Mức tiền không được âm" },
            ]}
          >
            <InputNumber<number>
              style={{ width: "100%" }}
              placeholder="Nhập mức tiền"
              min={0}
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value) => {
                const parsed = value?.replace(/\$\s?|(,*)/g, "");
                return (parsed ? Number(parsed) : 0) as number;
              }}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="hieuLucTu"
                label={fl('hieuLucTu', 'Hiệu lực từ')}
                className="mb-0"
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="hieuLucDen"
                label={fl('hieuLucDen', 'Hiệu lực đến')}
                className="mb-0"
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default DinhMucTienAnPage;
