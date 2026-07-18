import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Space,
  Tag,
  Tooltip,
  Popconfirm,
  Typography,
  Breadcrumb,
  Row,
  Col,
  message,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
  ImportOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { FilterBar } from "@/components/common/FilterBar";
import { useTableTitleConfig } from "@/components/glossary/useTableTitleConfig";
import { useBulkDelete } from "@/components/table/useBulkDelete";
import { usePagePermission } from "@/hooks/usePagePermission";
import {
  BangKeRecord,
  THUE_SUAT_OPTIONS,
  ThueSuat,
} from "@/services/taxService";
import type { ServiceBase } from "@/services/base/service-base";
import { ImportBangKeModal, type ImportService } from "./import/ImportBangKeModal";

const { Text } = Typography;

// Hệ số thuế suất để xem trước (BE là nguồn chân lý khi lưu).
const RATE: Record<ThueSuat, number> = {
  "0": 0,
  "5": 0.05,
  "8": 0.08,
  "10": 0.1,
  KCT: 0,
  KKKT: 0,
};

const fmt = (n?: number) => (n ?? 0).toLocaleString("vi-VN");

export interface BangKeService extends ServiceBase, ImportService {
  getPaginated: (params: {
    page?: number;
    limit?: number;
    search?: string;
    quy?: number;
    nam?: number;
  }) => Promise<{ data: BangKeRecord[]; meta: { total: number; page: number; limit: number; totalPages: number } }>;
  create: (payload: Partial<BangKeRecord>) => Promise<BangKeRecord>;
  update: (id: string, payload: Partial<BangKeRecord>) => Promise<BangKeRecord>;
  remove: (id: string) => Promise<void>;
}

interface Props {
  variant: "mua" | "ban";
  service: BangKeService;
  routeKey: string; // "/thue/bang-ke-mua-vao"
  title: string; // "Bảng kê mua vào"
}

const QUY_OPTIONS = [
  { value: 0, label: "Cả năm" },
  { value: 1, label: "Quý 1" },
  { value: 2, label: "Quý 2" },
  { value: 3, label: "Quý 3" },
  { value: 4, label: "Quý 4" },
];

const BangKePage: React.FC<Props> = ({ variant, service, routeKey, title }) => {
  const { canCreate, canEdit, canDelete } = usePagePermission(routeKey);
  const partnerLabel = variant === "mua" ? "Người bán" : "Người mua";
  const tenField = variant === "mua" ? "tenNguoiBan" : "tenNguoiMua";
  const mstField = variant === "mua" ? "mstNguoiBan" : "mstNguoiMua";

  const [data, setData] = useState<BangKeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [nam, setNam] = useState<number>(dayjs().year());
  const [quy, setQuy] = useState<number>(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BangKeRecord | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });

  const giaWatch = Form.useWatch("giaTriChuaThue", form) as number | undefined;
  const suatWatch = Form.useWatch("thueSuat", form) as ThueSuat | undefined;
  const thueWatch = Form.useWatch("tienThue", form) as number | undefined;

  // Tiền thuế / tổng thanh toán sửa tay được (hóa đơn hay lệch vài đồng do làm tròn trên từng
  // dòng hàng). Lệch quá ngưỡng này thì cảnh báo — bắt lỗi gõ nhầm chữ số, không chặn lưu.
  const thueTheoCongThuc = Math.round((giaWatch || 0) * (RATE[suatWatch ?? "10"] ?? 0));
  const lechTienThue = Math.abs((thueWatch || 0) - thueTheoCongThuc);
  const LECH_WARN = 1000;

  /** Quy tắc liên động: đổi giá trị/thuế suất → tính lại cả hai; sửa tiền thuế → tổng bám theo. */
  const handleValuesChange = (
    changed: Record<string, unknown>,
    all: Record<string, unknown>,
  ) => {
    const gia = Number(all.giaTriChuaThue) || 0;
    const suat = (all.thueSuat ?? "10") as ThueSuat;

    if ("giaTriChuaThue" in changed || "thueSuat" in changed) {
      const thue = Math.round(gia * (RATE[suat] ?? 0));
      form.setFieldsValue({ tienThue: thue, tongThanhToan: gia + thue });
      return;
    }
    if ("tienThue" in changed) {
      form.setFieldsValue({ tongThanhToan: gia + (Number(all.tienThue) || 0) });
    }
    // Sửa tổng thanh toán → không đụng gì khác.
  };

  const fetchData = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    search = searchText,
    namArg = nam,
    quyArg = quy,
  ) => {
    setLoading(true);
    try {
      const result = await service.getPaginated({
        page,
        limit: pageSize,
        search: search || undefined,
        nam: namArg,
        quy: quyArg || undefined,
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

  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<BangKeRecord>({
    enabled: canDelete,
    itemLabel: "hóa đơn",
    onDeleteBatch: (ids) => service.deleteBatch(ids),
    onDone: () => fetchData(pagination.current, pagination.pageSize, searchText, nam, quy),
  });

  useEffect(() => {
    fetchData(1, pagination.pageSize, "", nam, quy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      ngayHoaDon: dayjs(),
      thueSuat: "10",
      giaTriChuaThue: 0,
      tienThue: 0,
      tongThanhToan: 0,
    });
    setModalVisible(true);
  };

  const handleEdit = (record: BangKeRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      ngayHoaDon: record.ngayHoaDon ? dayjs(record.ngayHoaDon) : undefined,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: Partial<BangKeRecord> = {
        ...values,
        ngayHoaDon: values.ngayHoaDon
          ? (values.ngayHoaDon as dayjs.Dayjs).toISOString()
          : undefined,
      };
      if (editingRecord) {
        await service.update(editingRecord.id, payload);
        message.success("Cập nhật hóa đơn thành công");
      } else {
        await service.create(payload);
        message.success("Thêm hóa đơn thành công");
      }
      setModalVisible(false);
      fetchData(pagination.current, pagination.pageSize, searchText, nam, quy);
    } catch (err) {
      // validation errors handled by antd
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await service.remove(id);
      message.success("Xóa hóa đơn thành công");
      fetchData(pagination.current, pagination.pageSize, searchText, nam, quy);
    } catch {
      message.error("Không thể xóa hóa đơn");
    }
  };

  const columns = [
    {
      title: "Ngày HĐ",
      dataIndex: "ngayHoaDon",
      key: "ngayHoaDon",
      width: 110,
      render: (v: string) => (v ? dayjs(v).format("DD/MM/YYYY") : ""),
      sorter: (a: BangKeRecord, b: BangKeRecord) =>
        dayjs(a.ngayHoaDon).valueOf() - dayjs(b.ngayHoaDon).valueOf(),
    },
    { title: "Số HĐ", dataIndex: "soHoaDon", key: "soHoaDon", width: 110 },
    { title: "Ký hiệu", dataIndex: "kyHieuHoaDon", key: "kyHieuHoaDon", width: 100 },
    { title: partnerLabel, dataIndex: tenField, key: tenField, ellipsis: true },
    { title: "MST", dataIndex: mstField, key: mstField, width: 130 },
    { title: "Hàng hóa/DV", dataIndex: "tenHangHoa", key: "tenHangHoa", ellipsis: true },
    {
      title: "Giá trị chưa thuế",
      dataIndex: "giaTriChuaThue",
      key: "giaTriChuaThue",
      width: 140,
      align: "right" as const,
      render: (v: number) => fmt(v),
    },
    {
      title: "TS",
      dataIndex: "thueSuat",
      key: "thueSuat",
      width: 70,
      align: "center" as const,
      render: (v: ThueSuat) => <Tag>{THUE_SUAT_OPTIONS.find((o) => o.value === v)?.label ?? v}</Tag>,
    },
    {
      title: "Tiền thuế",
      dataIndex: "tienThue",
      key: "tienThue",
      width: 130,
      align: "right" as const,
      render: (v: number) => fmt(v),
    },
    {
      title: "Tổng TT",
      dataIndex: "tongThanhToan",
      key: "tongThanhToan",
      width: 140,
      align: "right" as const,
      render: (v: number) => <Text strong>{fmt(v)}</Text>,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 90,
      fixed: "right" as const,
      render: (_: unknown, record: BangKeRecord) => (
        <Space size="small">
          {canEdit && (
            <Tooltip title="Sửa">
              <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} className="text-primary" />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm
              title="Xác nhận xóa"
              description="Bạn có chắc chắn muốn xóa hóa đơn này?"
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

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('thue.bangKe', columns);

  return (
    <div className="space-y-3">
      <Breadcrumb
        items={[
          { href: "/", title: <HomeOutlined /> },
          { title: "Thuế" },
          { title },
        ]}
      />

      <Card>
        <FilterBar
          search={{
            value: searchText,
            onChange: setSearchText,
            onSearch: () => {
              clearSelection();
              fetchData(1, pagination.pageSize, searchText, nam, quy);
            },
            placeholder: "Tìm theo số HĐ, tên hoặc MST...",
            width: 360,
          }}
          onReset={() => {
            clearSelection();
            setSearchText("");
            fetchData(1, pagination.pageSize, "", nam, quy);
          }}
          actions={
            <>
              <Select
                value={quy}
                onChange={(v) => {
                  clearSelection();
                  setQuy(v);
                  fetchData(1, pagination.pageSize, searchText, nam, v);
                }}
                options={QUY_OPTIONS}
                style={{ width: 110 }}
              />
              <InputNumber
                value={nam}
                onChange={(v) => {
                  const y = v || dayjs().year();
                  clearSelection();
                  setNam(y);
                  fetchData(1, pagination.pageSize, searchText, y, quy);
                }}
                style={{ width: 100 }}
              />
              {canCreate && (
                <Button icon={<ImportOutlined />} onClick={() => setImportVisible(true)}>
                  Import Excel
                </Button>
              )}
              {bulkDeleteButton}
              {canCreate && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                  Thêm hóa đơn
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
          scroll={{ x: 1200, y: "calc(100vh - 285px)" }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} hóa đơn`,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          onChange={(pag) => {
            clearSelection();
            fetchData(pag.current || 1, pag.pageSize || 50, searchText, nam, quy);
          }}
          summary={(pageData) => {
            const tGia = pageData.reduce((s, r) => s + (r.giaTriChuaThue || 0), 0);
            const tThue = pageData.reduce((s, r) => s + (r.tienThue || 0), 0);
            const tTong = pageData.reduce((s, r) => s + (r.tongThanhToan || 0), 0);
            // Cột checkbox (khi có quyền xóa) chiếm 1 ô ở đầu → dòng tổng phải dịch theo, nếu không lệch cột.
            const off = rowSelection ? 1 : 0;
            return (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  {rowSelection && <Table.Summary.Cell index={0} />}
                  <Table.Summary.Cell index={off} colSpan={6}>
                    <Text strong>Tổng trang</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={off + 6} align="right">
                    <Text strong>{fmt(tGia)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={off + 7} />
                  <Table.Summary.Cell index={off + 8} align="right">
                    <Text strong>{fmt(tThue)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={off + 9} align="right">
                    <Text strong>{fmt(tTong)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={off + 10} />
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </Card>

      <Modal
        title={editingRecord ? "Sửa hóa đơn" : "Thêm hóa đơn mới"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={640}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          size="small"
          className="mt-2"
          onValuesChange={handleValuesChange}
        >
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="ngayHoaDon" label="Ngày hóa đơn" className="mb-3" rules={[{ required: true, message: "Chọn ngày" }]}>
                <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="soHoaDon" label="Số hóa đơn" className="mb-3" rules={[{ required: true, message: "Nhập số HĐ" }]}>
                <Input placeholder="VD: 0000123" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="kyHieuHoaDon" label="Ký hiệu" className="mb-3">
                <Input placeholder="VD: 1C25TAA" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name={tenField} label={partnerLabel} className="mb-3" rules={[{ required: true, message: `Nhập tên ${partnerLabel.toLowerCase()}` }]}>
                <Input placeholder={`Tên ${partnerLabel.toLowerCase()}`} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={mstField} label="Mã số thuế" className="mb-3">
                <Input placeholder="MST" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="tenHangHoa" label="Tên hàng hóa / dịch vụ" className="mb-3">
            <Input placeholder="Diễn giải hàng hóa, dịch vụ" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="giaTriChuaThue" label="Giá trị chưa thuế" className="mb-3" rules={[{ required: true, message: "Nhập giá trị" }]}>
                <InputNumber<number>
                  style={{ width: "100%" }}
                  min={0}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  parser={(v) => Number((v || "").replace(/,/g, ""))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="thueSuat" label="Thuế suất" className="mb-3" rules={[{ required: true, message: "Chọn thuế suất" }]}>
                <Select options={THUE_SUAT_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="tienThue"
                label="Tiền thuế"
                className="mb-0"
                extra={
                  lechTienThue > LECH_WARN ? (
                    <span style={{ color: "#faad14" }}>
                      Lệch {fmt(lechTienThue)} đ so với công thức ({fmt(thueTheoCongThuc)} đ)
                    </span>
                  ) : undefined
                }
              >
                <InputNumber<number>
                  style={{ width: "100%" }}
                  min={0}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  parser={(v) => Number((v || "").replace(/,/g, ""))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tongThanhToan" label="Tổng thanh toán" className="mb-0">
                <InputNumber<number>
                  style={{ width: "100%" }}
                  min={0}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  parser={(v) => Number((v || "").replace(/,/g, ""))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="ghiChu" label="Ghi chú" className="mb-0 mt-3">
            <Input.TextArea rows={2} placeholder="Ghi chú" />
          </Form.Item>
        </Form>
      </Modal>

      <ImportBangKeModal
        open={importVisible}
        onClose={() => setImportVisible(false)}
        onImported={() => {
          clearSelection();
          fetchData(1, pagination.pageSize, searchText, nam, quy);
        }}
        variant={variant}
        service={service}
      />
    </div>
  );
};

export default BangKePage;
