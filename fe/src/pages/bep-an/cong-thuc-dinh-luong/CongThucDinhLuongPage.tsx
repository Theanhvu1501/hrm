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
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ReloadOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { CongThucDinhLuong, ChiTietCongThuc } from "@/types";
import { congThucDinhLuongService } from "@/services/congThucDinhLuongService";
import { z } from "zod";
import { usePagePermission } from "@/hooks/usePagePermission";
import { FilterBar } from "@/components/common/FilterBar";
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';
import { useBulkDelete } from '@/components/table/useBulkDelete';
import { CongThucChiTietTable } from "./CongThucChiTietTable";

const { Text } = Typography;

const ganTheoOptions: { value: string; label: string }[] = [
  { value: "SUAT_CHUAN", label: "Suất chuẩn" },
  { value: "DO_TUOI", label: "Độ tuổi" },
  { value: "GOI_AN", label: "Gói ăn" },
];

const congThucDinhLuongSchema = z.object({
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
  ganTheo: z.string().optional().nullable(),
  doiTuongMa: z.string().max(50, "Đối tượng tối đa 50 ký tự").optional().nullable(),
});

const CongThucDinhLuongPage: React.FC = () => {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/bep-an/cong-thuc-dinh-luong");
  const [data, setData] = useState<CongThucDinhLuong[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CongThucDinhLuong | null>(null);
  const [chiTiet, setChiTiet] = useState<ChiTietCongThuc[]>([]);
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
      const result = await congThucDinhLuongService.getPaginated({
        page,
        limit: pageSize,
        search: search || undefined,
      });

      if (result.data.length === 0 && page > 1 && result.meta.totalPages >= 1) {
        const newPage = Math.max(1, result.meta.totalPages);
        const newResult = await congThucDinhLuongService.getPaginated({
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

  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<CongThucDinhLuong>({
    enabled: canDelete,
    itemLabel: "công thức",
    onDeleteBatch: (ids) => congThucDinhLuongService.deleteBatch(ids),
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
    setChiTiet([]);
    setModalVisible(true);
  };

  const handleEdit = (record: CongThucDinhLuong) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setChiTiet(record.chiTiet || []);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const validated = congThucDinhLuongSchema.parse(values);

      if (chiTiet.length === 0) {
        message.error("Cần ít nhất 1 nguyên liệu");
        return;
      }
      if (chiTiet.some((row) => !row.hangHoaMa)) {
        message.error("Cần ít nhất 1 nguyên liệu");
        return;
      }

      const codeExists = await congThucDinhLuongService.checkCodeExists(
        validated.code,
        editingRecord?.id
      );
      if (codeExists) {
        message.error("Mã công thức định lượng đã tồn tại");
        return;
      }

      const submitData = { ...validated, chiTiet };

      if (editingRecord) {
        await congThucDinhLuongService.update(editingRecord.id, submitData);
        message.success("Cập nhật công thức định lượng thành công");
      } else {
        await congThucDinhLuongService.create(submitData as Omit<CongThucDinhLuong, "id">);
        message.success("Thêm công thức định lượng thành công");
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
      await congThucDinhLuongService.remove(id);
      message.success("Xóa công thức định lượng thành công");
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch {
      message.error("Không thể xóa công thức định lượng");
    }
  };

  const getGanTheoLabel = (value?: string) =>
    ganTheoOptions.find((o) => o.value === value)?.label || "-";

  const columns = [
    {
      title: "Mã",
      dataIndex: "code",
      key: "code",
      width: 120,
      sorter: (a: CongThucDinhLuong, b: CongThucDinhLuong) => a.code.localeCompare(b.code),
      render: (text: string) => (
        <Text strong className="text-primary">
          {text}
        </Text>
      ),
    },
    {
      title: "Tên công thức",
      dataIndex: "ten",
      key: "ten",
      ellipsis: true,
      sorter: (a: CongThucDinhLuong, b: CongThucDinhLuong) => a.ten.localeCompare(b.ten),
    },
    {
      title: "Gắn theo",
      dataIndex: "ganTheo",
      key: "ganTheo",
      width: 130,
      render: (value: string) => getGanTheoLabel(value),
    },
    {
      title: "Đối tượng",
      dataIndex: "doiTuongMa",
      key: "doiTuongMa",
      width: 140,
      render: (text: string) => text || "-",
    },
    {
      title: "Số nguyên liệu",
      dataIndex: "chiTiet",
      key: "chiTiet",
      width: 130,
      align: "right" as const,
      render: (value: ChiTietCongThuc[]) => value?.length || 0,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      fixed: "right" as const,
      render: (_: unknown, record: CongThucDinhLuong) => (
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
              description="Bạn có chắc chắn muốn xóa công thức định lượng này?"
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

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('bepAn.congThucDinhLuong', columns);
  const fl = useFieldLabels('bepAn.congThucDinhLuong');

  return (
    <div className="space-y-3">
      <Breadcrumb
        items={[
          { href: "/", title: <HomeOutlined /> },
          { title: "Bếp ăn" },
          { title: "Công thức định lượng" },
        ]}
      />

      <Card>
        <FilterBar
          search={{
            value: searchText,
            onChange: handleSearch,
            placeholder: "Tìm kiếm theo mã hoặc tên công thức...",
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
                  Thêm công thức
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
              `${range[0]}-${range[1]} của ${total} công thức`,
            pageSizeOptions: ["25", "50", "100", "200"],
          }}
          onChange={(pag) =>
            handleTableChange({ current: pag.current, pageSize: pag.pageSize })
          }
        />
      </Card>

      <Modal
        title={editingRecord ? "Sửa công thức định lượng" : "Thêm công thức định lượng mới"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={800}
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
                <Input placeholder="VD: CT01" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="ten"
                label={fl('ten', 'Tên công thức')}
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập tên công thức" },
                  { max: 200, message: "Tên tối đa 200 ký tự" },
                ]}
              >
                <Input placeholder="Nhập tên công thức" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="ganTheo"
                label={fl('ganTheo', 'Gắn theo')}
                className="mb-3"
              >
                <Select
                  placeholder="Chọn gắn theo"
                  allowClear
                  options={ganTheoOptions}
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
                <Input placeholder="VD: Mã suất / độ tuổi / gói ăn" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label={fl('chiTiet', 'Nguyên liệu')} className="mb-0">
            <CongThucChiTietTable value={chiTiet} onChange={setChiTiet} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CongThucDinhLuongPage;
