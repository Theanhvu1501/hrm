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
  DatePicker,
  message,
  Popconfirm,
  Tooltip,
  Typography,
  Tag,
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
  SendOutlined,
  CheckOutlined,
  CloseOutlined,
  InboxOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { DeXuatMua, ChiTietDeXuat, TrangThaiDeXuat } from "@/types";
import { deXuatMuaService } from "@/services/deXuatMuaService";
import { doiTuongService } from "@/services/doiTuongService";
import { formatCurrency } from "@/pages/chung-tu/phieu/lib/format";
import { z } from "zod";
import { usePagePermission } from "@/hooks/usePagePermission";
import { FilterBar } from "@/components/common/FilterBar";
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';
import { useBulkDelete } from '@/components/table/useBulkDelete';
import { DeXuatChiTietTable } from "./DeXuatChiTietTable";

const { Text } = Typography;

const trangThaiConfig: Record<TrangThaiDeXuat, { color: string; label: string }> = {
  NHAP: { color: "default", label: "Nháp" },
  CHO_DUYET: { color: "processing", label: "Chờ duyệt" },
  DA_DUYET: { color: "blue", label: "Đã duyệt" },
  TU_CHOI: { color: "red", label: "Từ chối" },
  DA_NHAN: { color: "green", label: "Đã nhận" },
};

const deXuatMuaSchema = z.object({
  ngayDeXuat: z.string().min(1, "Vui lòng chọn ngày đề xuất"),
  nguoiDeXuat: z.string().max(200, "Người đề xuất tối đa 200 ký tự").optional().nullable(),
  doiTuongMa: z.string().max(50).optional().nullable(),
  doiTuongTen: z.string().max(200).optional().nullable(),
});

const DeXuatMuaPage: React.FC = () => {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/bep-an/de-xuat-mua");
  const [data, setData] = useState<DeXuatMua[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DeXuatMua | null>(null);
  const [chiTiet, setChiTiet] = useState<ChiTietDeXuat[]>([]);
  const [doiTuongOptions, setDoiTuongOptions] = useState<{ value: string; label: string; ten: string }[]>([]);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });

  // Modal từ chối
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectForm] = Form.useForm();

  const isReadOnly = !!editingRecord && editingRecord.trangThai !== "NHAP";

  const fetchData = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    search = searchText
  ) => {
    setLoading(true);
    try {
      const result = await deXuatMuaService.getPaginated({
        page,
        limit: pageSize,
        search: search || undefined,
      });

      if (result.data.length === 0 && page > 1 && result.meta.totalPages >= 1) {
        const newPage = Math.max(1, result.meta.totalPages);
        const newResult = await deXuatMuaService.getPaginated({
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

  // BE bỏ qua đề xuất đã duyệt / đã nhận (rơi vào `skipped`) → không lọc gì thêm ở FE.
  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<DeXuatMua>({
    enabled: canDelete,
    itemLabel: "đề xuất",
    onDeleteBatch: (ids) => deXuatMuaService.deleteBatch(ids),
    onDone: () => fetchData(pagination.current, pagination.pageSize, searchText),
  });

  useEffect(() => {
    fetchData(1, pagination.pageSize, "");
    doiTuongService
      .getAll("NHA_CUNG_CAP")
      .then((list) =>
        setDoiTuongOptions(
          list.map((d) => ({ value: d.ma, label: `${d.ma} - ${d.ten}`, ten: d.ten }))
        )
      )
      .catch(() => setDoiTuongOptions([]));
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

  const handleEdit = (record: DeXuatMua) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      ngayDeXuat: record.ngayDeXuat ? dayjs(record.ngayDeXuat) : undefined,
    });
    setChiTiet(record.chiTiet || []);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (chiTiet.length === 0) {
        message.error("Vui lòng thêm ít nhất một dòng chi tiết");
        return;
      }

      if (chiTiet.some((row) => !row.hangHoaMa)) {
        message.error("Mỗi dòng phải chọn hàng hóa");
        return;
      }

      const submitData = {
        ...values,
        ngayDeXuat: values.ngayDeXuat ? values.ngayDeXuat.format("YYYY-MM-DD") : undefined,
      };

      const validated = deXuatMuaSchema.parse(submitData);

      const tongTien = chiTiet.reduce((sum, row) => sum + (row.thanhTien || 0), 0);
      const payload = {
        ...validated,
        chiTiet,
        tongTien,
      };

      if (editingRecord) {
        await deXuatMuaService.update(editingRecord.id, payload);
        message.success("Cập nhật đề xuất mua thành công");
      } else {
        await deXuatMuaService.create(payload as Omit<DeXuatMua, "id">);
        message.success("Thêm đề xuất mua thành công");
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
      await deXuatMuaService.remove(id);
      message.success("Xóa đề xuất mua thành công");
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch (error: any) {
      message.error(error?.message || "Không thể xóa đề xuất mua");
    }
  };

  const handleSubmitApproval = async (id: string) => {
    try {
      await deXuatMuaService.submit(id);
      message.success("Đã gửi duyệt");
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch (error: any) {
      message.error(error?.message || "Gửi duyệt thất bại");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await deXuatMuaService.approve(id);
      message.success("Đã duyệt đề xuất");
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch (error: any) {
      message.error(error?.message || "Duyệt thất bại");
    }
  };

  const openRejectModal = (id: string) => {
    setRejectingId(id);
    rejectForm.resetFields();
    setRejectModalVisible(true);
  };

  const handleReject = async () => {
    try {
      const values = await rejectForm.validateFields();
      if (!rejectingId) return;
      await deXuatMuaService.reject(rejectingId, values.lyDoTuChoi);
      message.success("Đã từ chối đề xuất");
      setRejectModalVisible(false);
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch (error: any) {
      if (!(error as any)?.errorFields) {
        message.error(error?.message || "Từ chối thất bại");
      }
    }
  };

  const handleNhanHang = async (id: string) => {
    try {
      await deXuatMuaService.nhanHang(id);
      message.success("Đã nhận hàng, ghi bút toán 152/331 + phiếu nhập kho thành công");
      fetchData(pagination.current, pagination.pageSize, searchText);
    } catch (error: any) {
      message.error(error?.message || "Nhận hàng thất bại");
    }
  };

  const columns = [
    {
      title: "Số phiếu",
      dataIndex: "soPhieu",
      key: "soPhieu",
      width: 130,
      sorter: (a: DeXuatMua, b: DeXuatMua) => (a.soPhieu || "").localeCompare(b.soPhieu || ""),
      render: (text: string) => (
        <Text strong className="text-primary">
          {text}
        </Text>
      ),
    },
    {
      title: "Ngày",
      dataIndex: "ngayDeXuat",
      key: "ngayDeXuat",
      width: 110,
      render: (value: string) => (value ? dayjs(value).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "NCC",
      dataIndex: "doiTuongTen",
      key: "doiTuongTen",
      ellipsis: true,
      render: (text: string) => text || "-",
    },
    {
      title: "Tổng tiền",
      dataIndex: "tongTien",
      key: "tongTien",
      width: 150,
      align: "right" as const,
      render: (value: number) => formatCurrency(value || 0),
    },
    {
      title: "Trạng thái",
      dataIndex: "trangThai",
      key: "trangThai",
      width: 120,
      render: (value: TrangThaiDeXuat) => {
        const cfg = trangThaiConfig[value] || trangThaiConfig.NHAP;
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 200,
      fixed: "right" as const,
      render: (_: unknown, record: DeXuatMua) => (
        <Space size="small">
          {record.trangThai === "NHAP" && (
            <>
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
                  description="Bạn có chắc chắn muốn xóa đề xuất này?"
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
              {canEdit && (
                <Tooltip title="Gửi duyệt">
                  <Button
                    type="text"
                    icon={<SendOutlined />}
                    onClick={() => handleSubmitApproval(record.id)}
                  />
                </Tooltip>
              )}
            </>
          )}
          {record.trangThai === "CHO_DUYET" && (
            <>
              {canEdit && (
                <Tooltip title="Duyệt">
                  <Button
                    type="text"
                    icon={<CheckOutlined />}
                    style={{ color: "#1677ff" }}
                    onClick={() => handleApprove(record.id)}
                  />
                </Tooltip>
              )}
              {canEdit && (
                <Tooltip title="Từ chối">
                  <Button
                    type="text"
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => openRejectModal(record.id)}
                  />
                </Tooltip>
              )}
            </>
          )}
          {record.trangThai === "DA_DUYET" && canEdit && (
            <Popconfirm
              title="Xác nhận nhận hàng?"
              description="Sẽ ghi bút toán 152/331 + phiếu nhập kho."
              onConfirm={() => handleNhanHang(record.id)}
              okText="Nhận hàng"
              cancelText="Hủy"
            >
              <Tooltip title="Nhận hàng">
                <Button type="text" icon={<InboxOutlined />} style={{ color: "#52c41a" }} />
              </Tooltip>
            </Popconfirm>
          )}
          <Tooltip title="Xem">
            <Button type="text" icon={<EyeOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('bepAn.deXuatMua', columns);
  const fl = useFieldLabels('bepAn.deXuatMua');

  return (
    <div className="space-y-3">
      <Breadcrumb
        items={[
          { href: "/", title: <HomeOutlined /> },
          { title: "Bếp ăn" },
          { title: "Đề xuất mua thực phẩm" },
        ]}
      />

      <Card>
        <FilterBar
          search={{
            value: searchText,
            onChange: handleSearch,
            placeholder: "Tìm kiếm theo số phiếu, người đề xuất...",
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
                  Thêm đề xuất mua
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
              `${range[0]}-${range[1]} của ${total} đề xuất`,
            pageSizeOptions: ["25", "50", "100", "200"],
          }}
          onChange={(pag) =>
            handleTableChange({ current: pag.current, pageSize: pag.pageSize })
          }
        />
      </Card>

      <Modal
        title={
          isReadOnly
            ? "Xem đề xuất mua thực phẩm"
            : editingRecord
            ? "Sửa đề xuất mua thực phẩm"
            : "Thêm đề xuất mua thực phẩm mới"
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={isReadOnly ? () => setModalVisible(false) : handleSubmit}
        okText={isReadOnly ? undefined : editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText={isReadOnly ? "Đóng" : "Hủy"}
        footer={
          isReadOnly
            ? [
                <Button key="close" onClick={() => setModalVisible(false)}>
                  Đóng
                </Button>,
              ]
            : undefined
        }
        width={860}
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small" className="mt-2" disabled={isReadOnly}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                name="ngayDeXuat"
                label={fl('ngayDeXuat', 'Ngày đề xuất')}
                className="mb-3"
                rules={[{ required: true, message: "Vui lòng chọn ngày đề xuất" }]}
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="nguoiDeXuat"
                label={fl('nguoiDeXuat', 'Người đề xuất')}
                className="mb-3"
              >
                <Input placeholder="Nhập tên người đề xuất" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="doiTuongMa"
                label={fl('doiTuongMa', 'Nhà cung cấp')}
                className="mb-3"
              >
                <Select
                  placeholder="-- Chọn NCC --"
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  options={doiTuongOptions}
                  onChange={(ma: string) => {
                    const dt = doiTuongOptions.find((d) => d.value === ma);
                    form.setFieldsValue({
                      doiTuongMa: ma || "",
                      doiTuongTen: dt?.ten || "",
                    });
                  }}
                  onClear={() => form.setFieldsValue({ doiTuongMa: "", doiTuongTen: "" })}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="doiTuongTen" hidden>
            <Input />
          </Form.Item>

          <Form.Item label={fl('chiTiet', 'Chi tiết hàng hóa')} className="mb-0">
            <DeXuatChiTietTable value={chiTiet} onChange={setChiTiet} disabled={isReadOnly} />
          </Form.Item>

          {editingRecord?.trangThai === "TU_CHOI" && editingRecord?.lyDoTuChoi && (
            <div className="mt-3">
              <Text type="danger">Lý do từ chối: {editingRecord.lyDoTuChoi}</Text>
            </div>
          )}
        </Form>
      </Modal>

      <Modal
        title="Từ chối đề xuất mua"
        open={rejectModalVisible}
        onCancel={() => setRejectModalVisible(false)}
        onOk={handleReject}
        okText="Từ chối"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        width={480}
        destroyOnClose
      >
        <Form form={rejectForm} layout="vertical" size="small" className="mt-2">
          <Form.Item
            name="lyDoTuChoi"
            label="Lý do từ chối"
            rules={[{ required: true, message: "Vui lòng nhập lý do từ chối" }]}
          >
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="Nhập lý do từ chối..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DeXuatMuaPage;
