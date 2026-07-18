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
  InputNumber,
  Tag,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ReloadOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { HangHoaVatTu, TinhChatVatTu, DonViTinh, NhomVatTu } from "@/types";
import { hangHoaVatTuService } from "@/services/hangHoaVatTuService";
import { donViTinhService } from "@/services/donViTinhService";
import { nhomVatTuService } from "@/services/nhomVatTuService";
import { z } from "zod";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useBulkDelete } from "@/components/table/useBulkDelete";
import { FilterBar } from "@/components/common/FilterBar";
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';

const { Text } = Typography;
const { TextArea } = Input;

const tinhChatOptions = [
  { value: "TAI_SAN", label: "Tài sản" },
  { value: "HANG_HOA", label: "Hàng hóa" },
  { value: "NGUYEN_LIEU", label: "Nguyên liệu" },
];

const tinhChatLabelMap: Record<TinhChatVatTu, string> = {
  TAI_SAN: "Tài sản",
  HANG_HOA: "Hàng hóa",
  NGUYEN_LIEU: "Nguyên liệu",
};

const tinhChatColorMap: Record<TinhChatVatTu, string> = {
  TAI_SAN: "blue",
  HANG_HOA: "green",
  NGUYEN_LIEU: "orange",
};

const hangHoaVatTuSchema = z.object({
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
  tinhChat: z.enum(["TAI_SAN", "HANG_HOA", "NGUYEN_LIEU"]).optional().nullable(),
  donViTinhMa: z.string().optional().nullable(),
  donViTinhTen: z.string().optional().nullable(),
  nhomVatTuMa: z.string().optional().nullable(),
  nhomVatTuTen: z.string().optional().nullable(),
  quyCach: z.string().max(200, "Quy cách tối đa 200 ký tự").optional().nullable(),
  tkKho: z.string().max(20, "Tài khoản kho tối đa 20 ký tự").optional().nullable(),
  donGia: z.number().min(0, "Đơn giá không được âm").optional().nullable(),
  moTa: z.string().max(500, "Mô tả tối đa 500 ký tự").optional().nullable(),
});

const HangHoaVatTuPage: React.FC = () => {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/danh-muc/hang-hoa-vat-tu");
  const [data, setData] = useState<HangHoaVatTu[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HangHoaVatTu | null>(null);
  const [form] = Form.useForm();
  const [donViTinhList, setDonViTinhList] = useState<DonViTinh[]>([]);
  const [nhomVatTuList, setNhomVatTuList] = useState<NhomVatTu[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });

  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<HangHoaVatTu>({
    enabled: canDelete,
    itemLabel: "hàng hóa vật tư",
    onDeleteBatch: (ids) => hangHoaVatTuService.deleteBatch(ids),
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
      const result = await hangHoaVatTuService.getPaginated({
        page,
        limit: pageSize,
        search: search || undefined,
      });

      if (result.data.length === 0 && page > 1 && result.meta.totalPages >= 1) {
        const newPage = Math.max(1, result.meta.totalPages);
        const newResult = await hangHoaVatTuService.getPaginated({
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

  const fetchDependencies = async () => {
    try {
      const [dvt, nvt] = await Promise.all([
        donViTinhService.getAll(),
        nhomVatTuService.getAll(),
      ]);
      setDonViTinhList(dvt);
      setNhomVatTuList(nvt);
    } catch {
      // Dependencies load silently — not critical for page
    }
  };

  useEffect(() => {
    fetchData(1, pagination.pageSize, "");
    fetchDependencies();
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

  const handleEdit = (record: HangHoaVatTu) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const validated = hangHoaVatTuSchema.parse(values);

      const maExists = await hangHoaVatTuService.checkMaExists(
        validated.ma,
        editingRecord?.id
      );
      if (maExists) {
        message.error("Mã hàng hóa vật tư đã tồn tại");
        return;
      }

      if (editingRecord) {
        await hangHoaVatTuService.update(editingRecord.id, validated);
        message.success("Cập nhật hàng hóa vật tư thành công");
      } else {
        await hangHoaVatTuService.create(validated as Omit<HangHoaVatTu, "id">);
        message.success("Thêm hàng hóa vật tư thành công");
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
      await hangHoaVatTuService.remove(id);
      message.success("Xóa hàng hóa vật tư thành công");
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch {
      message.error("Không thể xóa hàng hóa vật tư");
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return "-";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const columns = [
    {
      title: "Mã",
      dataIndex: "ma",
      key: "ma",
      width: 120,
      sorter: (a: HangHoaVatTu, b: HangHoaVatTu) => a.ma.localeCompare(b.ma),
      render: (text: string) => (
        <Text strong className="text-primary">
          {text}
        </Text>
      ),
    },
    {
      title: "Tên hàng hóa/vật tư",
      dataIndex: "ten",
      key: "ten",
      ellipsis: true,
      sorter: (a: HangHoaVatTu, b: HangHoaVatTu) => a.ten.localeCompare(b.ten),
    },
    {
      title: "Tính chất",
      dataIndex: "tinhChat",
      key: "tinhChat",
      width: 120,
      render: (value: TinhChatVatTu) =>
        value ? (
          <Tag color={tinhChatColorMap[value]}>{tinhChatLabelMap[value]}</Tag>
        ) : (
          "-"
        ),
    },
    {
      title: "ĐVT",
      dataIndex: "donViTinhTen",
      key: "donViTinhTen",
      width: 100,
      render: (text: string) => text || "-",
    },
    {
      title: "Nhóm",
      dataIndex: "nhomVatTuTen",
      key: "nhomVatTuTen",
      width: 150,
      ellipsis: true,
      render: (text: string) => text || "-",
    },
    {
      title: "Đơn giá",
      dataIndex: "donGia",
      key: "donGia",
      width: 140,
      align: "right" as const,
      sorter: (a: HangHoaVatTu, b: HangHoaVatTu) =>
        (a.donGia || 0) - (b.donGia || 0),
      render: (value: number) => (
        <Text
          className={
            value ? "text-green-600 font-medium" : "text-muted-foreground"
          }
        >
          {formatCurrency(value)}
        </Text>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      fixed: "right" as const,
      render: (_: unknown, record: HangHoaVatTu) => (
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
              description="Bạn có chắc chắn muốn xóa hàng hóa vật tư này?"
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

  const fl = useFieldLabels('danhMuc.hangHoaVatTu');
  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('danhMuc.hangHoaVatTu', columns);

  return (
    <div className="space-y-3">
      <Breadcrumb
        items={[
          { href: "/", title: <HomeOutlined /> },
          { title: "Danh mục" },
          { title: "Hàng hóa vật tư" },
        ]}
      />

      <Card>
        <FilterBar
          search={{
            value: searchText,
            onChange: handleSearch,
            placeholder: "Tìm kiếm theo mã hoặc tên hàng hóa vật tư...",
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
                  Thêm hàng hóa vật tư
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
          scroll={{ x: 900, y: "calc(100vh - 285px)" }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} hàng hóa vật tư`,
            pageSizeOptions: ["25", "50", "100", "200"],
          }}
          onChange={(pag) =>
            handleTableChange({ current: pag.current, pageSize: pag.pageSize })
          }
        />
      </Card>

      <Modal
        title={
          editingRecord ? "Sửa hàng hóa vật tư" : "Thêm hàng hóa vật tư mới"
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={620}
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small" className="mt-2">
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                name="ma"
                label={fl('ma', 'Mã')}
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập mã" },
                  { max: 20, message: "Mã tối đa 20 ký tự" },
                ]}
              >
                <Input placeholder="VD: HHVT001" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="ten"
                label={fl('ten', 'Tên hàng hóa/vật tư')}
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập tên" },
                  { max: 200, message: "Tên tối đa 200 ký tự" },
                ]}
              >
                <Input placeholder="Nhập tên hàng hóa/vật tư" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="tinhChat" label={fl('tinhChat', 'Tính chất')} className="mb-3">
                <Select
                  placeholder="Chọn tính chất"
                  allowClear
                  options={tinhChatOptions}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="donViTinhMa" label={fl('donViTinhMa', 'Đơn vị tính')} className="mb-3">
                <Select
                  placeholder="Chọn đơn vị tính"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={donViTinhList.map((dvt) => ({
                    value: dvt.ma,
                    label: dvt.ten,
                  }))}
                  onChange={(value) => {
                    const selected = donViTinhList.find((dvt) => dvt.ma === value);
                    form.setFieldValue("donViTinhTen", selected?.ten ?? null);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="nhomVatTuMa" label={fl('nhomVatTuMa', 'Nhóm vật tư')} className="mb-3">
                <Select
                  placeholder="Chọn nhóm vật tư"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={nhomVatTuList.map((nvt) => ({
                    value: nvt.ma,
                    label: nvt.ten,
                  }))}
                  onChange={(value) => {
                    const selected = nhomVatTuList.find((nvt) => nvt.ma === value);
                    form.setFieldValue("nhomVatTuTen", selected?.ten ?? null);
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Hidden fields for Ten values */}
          <Form.Item name="donViTinhTen" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="nhomVatTuTen" hidden>
            <Input />
          </Form.Item>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="tkKho" label={fl('tkKho', 'TK Kho')} className="mb-3">
                <Input placeholder="VD: 1561" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="quyCach" label={fl('quyCach', 'Quy cách')} className="mb-3">
                <Input placeholder="Nhập quy cách" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="donGia"
                label={fl('donGia', 'Đơn giá (VNĐ)')}
                className="mb-3"
                rules={[
                  { type: "number", min: 0, message: "Đơn giá không được âm" },
                ]}
              >
                <InputNumber<number>
                  style={{ width: "100%" }}
                  placeholder="Nhập đơn giá"
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(value) => {
                    const parsed = value?.replace(/\$\s?|(,*)/g, "");
                    return (parsed ? Number(parsed) : 0) as number;
                  }}
                  min={0}
                />
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

export default HangHoaVatTuPage;
