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
  InputNumber,
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
  BankOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { FilterBar } from "@/components/common/FilterBar";
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';
import { useTableColumnFilters } from '@/components/table/useTableColumnFilters';
import { getTaiKhoanValue, keepWithAncestors } from './taiKhoanTreeFilter';
import { TaiKhoan } from "@/types";
import { taiKhoanService } from "@/services/taiKhoanService";
import { loaiTaiKhoan, nhomTaiKhoan } from "@/mock-data/tai-khoan";
import { z } from "zod";
import { usePagePermission } from "@/hooks/usePagePermission";

const { Text } = Typography;

// Validation schema
const taiKhoanSchema = z.object({
  ma: z
    .string()
    .min(1, "Mã tài khoản không được để trống")
    .max(20, "Mã tài khoản tối đa 20 ký tự"),
  ten: z
    .string()
    .min(1, "Tên tài khoản không được để trống")
    .max(200, "Tên tài khoản tối đa 200 ký tự"),
  capDo: z.number().min(1).max(5),
  loai: z.enum(["TAI_SAN", "NO_PHAI_TRA", "VON_CHU_SO_HUU", "DOANH_THU", "CHI_PHI", "THU_NHAP_KHAC", "CHI_PHI_KHAC", "XAC_DINH_KQKD"]),
  nhom: z.enum(["NO", "CO", "LUONG_TINH", "KHONG_CO_SO_DU"]),
  chiTietTheo: z.enum(["KHACH_HANG", "NHA_CUNG_CAP", "NHAN_VIEN", "NHA_THAU", "NGAN_HANG_QUY"]).nullable().optional(),
  parentId: z.string().nullable().optional(),
  moTa: z.string().max(500, "Mô tả tối đa 500 ký tự").nullable().optional(),
  fieldRules: z
    .record(z.string(), z.enum(["BAT_BUOC", "CANH_BAO"]).nullable().optional())
    .nullable()
    .optional(),
});

const chiTietTheoOptions = [
  { value: "KHACH_HANG", label: "Khách hàng" },
  { value: "NHA_CUNG_CAP", label: "Nhà cung cấp" },
  { value: "NHAN_VIEN", label: "Nhân viên" },
  { value: "NHA_THAU", label: "Nhà thầu" },
  { value: "NGAN_HANG_QUY", label: "Ngân hàng & Quỹ" },
];

// 8 trường phân bổ cấu hình được mức nhập liệu trên dòng hạch toán
const FIELD_RULE_FIELDS: Array<{ key: string; label: string }> = [
  { key: "doiTuong", label: "Đối tượng" },
  { key: "duAn", label: "Dự án" },
  { key: "boPhan", label: "Bộ phận" },
  { key: "doi", label: "Đội thi công" },
  { key: "nhanVien", label: "Nhân viên" },
  { key: "sanPham", label: "Sản phẩm" },
  { key: "dongTien", label: "Dòng tiền" },
  { key: "khoanMuc", label: "Khoản mục" },
  { key: "soTaiKhoanNganHang", label: "Số tài khoản ngân hàng" },
];

const fieldRuleLevelOptions = [
  { value: "CANH_BAO", label: "Cảnh báo" },
  { value: "BAT_BUOC", label: "Bắt buộc" },
];

// Sắp xếp tài khoản theo hierarchy: cha trước, con ngay sau cha (DFS)
const sortHierarchy = (accounts: TaiKhoan[]): TaiKhoan[] => {
  const childrenMap = new Map<string, TaiKhoan[]>();
  const roots: TaiKhoan[] = [];

  for (const acc of accounts) {
    if (acc.parentId) {
      const siblings = childrenMap.get(acc.parentId) ?? [];
      siblings.push(acc);
      childrenMap.set(acc.parentId, siblings);
    } else {
      roots.push(acc);
    }
  }

  // Sort siblings theo mã tài khoản
  const sortByMa = (a: TaiKhoan, b: TaiKhoan) => a.ma.localeCompare(b.ma);
  roots.sort(sortByMa);
  childrenMap.forEach((children) => children.sort(sortByMa));

  const result: TaiKhoan[] = [];
  const traverse = (items: TaiKhoan[]) => {
    for (const item of items) {
      result.push(item);
      const children = childrenMap.get(item.id);
      if (children) traverse(children);
    }
  };
  traverse(roots);

  return result;
};

const TaiKhoanPage: React.FC = () => {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/danh-muc/tai-khoan");
  const [allData, setAllData] = useState<TaiKhoan[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterNhom, setFilterNhom] = useState<string | undefined>(undefined);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TaiKhoan | null>(null);
  const [form] = Form.useForm();
  const [pageSize, setPageSize] = useState(100);

  // Lọc theo cột ở header + cố định cột
  const { filterable, matches, hasPinned } = useTableColumnFilters("danh-muc-tai-khoan");

  // Filter + sort hierarchy từ toàn bộ data.
  // `keepWithAncestors`: dòng nào khớp thì kéo theo cả TK cha — nếu không, `sortHierarchy` mất
  // gốc để duyệt và các TK con sẽ biến mất khỏi bảng dù chính nó khớp.
  const filteredData = React.useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const result = keepWithAncestors(allData, (acc) => {
      if (filterNhom && acc.nhom !== filterNhom) return false;
      if (
        keyword &&
        !acc.ma.toLowerCase().includes(keyword) &&
        !acc.ten.toLowerCase().includes(keyword)
      ) {
        return false;
      }
      return matches(acc, getTaiKhoanValue);
    });
    return sortHierarchy(result);
  }, [allData, filterNhom, searchText, matches]);

  // Tính cấp độ dựa trên tài khoản cha
  const calculateCapDo = (parentId: string | null | undefined): number => {
    if (!parentId) return 1;
    const parent = allData.find(p => p.id === parentId);
    return parent ? parent.capDo + 1 : 1;
  };

  // Cập nhật cấp độ khi thay đổi tài khoản cha
  const handleParentChange = (parentId: string | null) => {
    const capDo = calculateCapDo(parentId);
    form.setFieldsValue({ capDo });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const accounts = await taiKhoanService.getHierarchy();
      setAllData(accounts);
    } catch (error) {
      message.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (record?: TaiKhoan) => {
    if (record) {
      setEditingRecord(record);
      form.resetFields(); // xoá state cũ (kể cả nested fieldRules) trước khi đổ record mới
      form.setFieldsValue({
        ...record,
        moTa: record.moTa || '',
        fieldRules: record.fieldRules || {},
      });
    } else {
      setEditingRecord(null);
      form.resetFields();
      form.setFieldsValue({ capDo: 1, moTa: '' });
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Validate with zod
      const validation = taiKhoanSchema.safeParse(values);
      if (!validation.success) {
        const errors = validation.error.errors;
        message.error(errors[0].message);
        return;
      }

      // Send empty string as-is so BE sanitizeUpdateDto can convert to null.
      // chiTietTheo: gửi null khi bỏ chọn để BE xoá giá trị cũ (undefined sẽ bị JSON bỏ qua).
      // Bỏ các trường không chọn mức; rỗng → null để BE xoá cấu hình cũ
      const fieldRulesEntries = Object.entries(validation.data.fieldRules ?? {}).filter(
        ([, v]) => v === "BAT_BUOC" || v === "CANH_BAO"
      );
      const payload = {
        ...validation.data,
        chiTietTheo: validation.data.chiTietTheo ?? null,
        fieldRules: fieldRulesEntries.length ? Object.fromEntries(fieldRulesEntries) : null,
      } as Omit<TaiKhoan, "id">;

      setLoading(true);
      if (editingRecord) {
        await taiKhoanService.update(editingRecord.id, payload);
        message.success("Cập nhật tài khoản thành công");
      } else {
        await taiKhoanService.create(payload);
        message.success("Thêm tài khoản thành công");
      }
      setModalVisible(false);
      fetchData();
    } catch (error: any) {
      if (error.errorFields) {
        // Form validation error
        return;
      }
      message.error(error.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await taiKhoanService.remove(id);
      message.success("Xóa tài khoản thành công");
      fetchData();
    } catch (error: any) {
      message.error(error.message || "Không thể xóa tài khoản");
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<TaiKhoan> = [
    filterable<TaiKhoan>({
      title: "Mã TK",
      dataIndex: "ma",
      key: "ma",
      width: 120,
      render: (text: string, record: TaiKhoan) => (
        <Text strong style={{ paddingLeft: (record.capDo - 1) * 16 }}>
          {text}
        </Text>
      ),
    }),
    filterable<TaiKhoan>({
      title: "Tên tài khoản",
      dataIndex: "ten",
      key: "ten",
      // Cần width cố định: cột ghim (fixed) mà không có width sẽ vỡ layout của antd.
      width: 320,
      ellipsis: true,
      render: (text: string, record: TaiKhoan) => (
        <span style={{ paddingLeft: (record.capDo - 1) * 16 }}>
          {record.capDo > 1 && (
            <span className="text-muted-foreground mr-2">└</span>
          )}
          {text}
        </span>
      ),
    }),
    {
      title: "Cấp độ",
      dataIndex: "capDo",
      key: "capDo",
      width: 80,
      align: "center" as const,
      render: (capDo: number) => (
        <Tag color={capDo === 1 ? "blue" : "default"}>{capDo}</Tag>
      ),
    },
    {
      title: "Loại",
      dataIndex: "loai",
      key: "loai",
      width: 150,
      align: "center" as const,
      render: (loai: string) => {
        const loaiInfo = loaiTaiKhoan.find(l => l.value === loai);
        return <Tag color="blue">{loaiInfo?.label || loai}</Tag>;
      },
    },
    {
      title: "Nhóm",
      dataIndex: "nhom",
      key: "nhom",
      width: 180,
      render: (nhom: string) => {
        const nhomInfo = nhomTaiKhoan.find(n => n.value === nhom);
        return <Text type="secondary">{nhomInfo?.label || nhom}</Text>;
      },
    },
    {
      title: "Mô tả",
      dataIndex: "moTa",
      key: "moTa",
      ellipsis: true,
      render: (moTa: string) => (
        <Text type="secondary" className="text-sm">
          {moTa || "-"}
        </Text>
      ),
    },
    ...((canEdit || canDelete) ? [{
      title: "Thao tác",
      key: "action",
      width: 120,
      align: "center" as const,
      render: (_: any, record: TaiKhoan) => (
        <Space size="small">
          {canEdit && (
            <Tooltip title="Sửa">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openModal(record)}
                className="!text-primary hover:!bg-primary/10"
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
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                className="!text-destructive hover:!bg-destructive/10"
              />
            </Popconfirm>
          )}
        </Space>
      ),
    }] : []),
  ];

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('danhMuc.taiKhoan', columns);
  const fl = useFieldLabels('danhMuc.taiKhoan');

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          {
            href: "/",
            title: (
              <>
                <HomeOutlined /> Trang chủ
              </>
            ),
          },
          { title: "Danh mục" },
          { title: "Tài khoản kế toán" },
        ]}
      />

      {/* Page Header */}
      {/* <div className="page-header p-6 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <BankOutlined className="text-2xl" />
            <Title level={3} className="!text-white !mb-0">
              Danh mục Tài khoản Kế toán
            </Title>
          </div>
          <Text className="text-white/80">
            Quản lý hệ thống tài khoản kế toán theo chuẩn Việt Nam
          </Text>
        </div>
      </div> */}

      {/* Main Card */}
      <Card className="shadow-sm">
        {/* Toolbar */}
        <FilterBar
          search={{
            value: searchText,
            onChange: setSearchText,
            placeholder: "Tìm kiếm theo mã hoặc tên...",
            width: 280,
          }}
          onReset={() => {
            setSearchText("");
            setFilterNhom(undefined);
            fetchData();
          }}
          filters={
            <Select
              placeholder="Lọc theo nhóm"
              value={filterNhom}
              onChange={(value) => setFilterNhom(value)}
              style={{ width: 200 }}
              allowClear
              options={nhomTaiKhoan}
            />
          }
          actions={
            <>
              {canExport && <Button icon={<ExportOutlined />}>Xuất Excel</Button>}
              {canCreate && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => openModal()}
                >
                  Thêm tài khoản
                </Button>
              )}
              {settingsButton}
            </>
          }
        />

        {/* Table */}
        <Table
          columns={cfgColumns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} tài khoản`,
            pageSizeOptions: ["25", "50", "100", "200"],
            onChange: (_page, newPageSize) => setPageSize(newPageSize),
          }}
          size="middle"
          // Cột ghim (fixed) chỉ có tác dụng khi bảng cuộn ngang được → cần scroll.x.
          scroll={{ x: hasPinned ? "max-content" : 900, y: "calc(100vh - 285px)" }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <BankOutlined className="text-primary" />
            <span>
              {editingRecord ? "Sửa tài khoản" : "Thêm tài khoản mới"}
            </span>
          </div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={550}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" size="small" className="mt-2">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="ma"
                label={fl('ma', 'Mã tài khoản')}
                className="mb-3"
                rules={[
                  { required: true, message: "Vui lòng nhập mã tài khoản" },
                  { max: 20, message: "Tối đa 20 ký tự" },
                ]}
              >
                <Input placeholder="VD: 111, 1111" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="parentId"
                label={fl('parentId', 'Tài khoản cha')}
                className="mb-3"
              >
                <Select
                  placeholder="Không có (cấp 1)"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  onChange={handleParentChange}
                  options={allData
                    .filter((p) => p.capDo < 5 && (!editingRecord || p.id !== editingRecord.id))
                    .map((p) => ({
                      label: `${p.ma} - ${p.ten}`,
                      value: p.id,
                    }))}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Hidden field for capDo */}
          <Form.Item name="capDo" hidden>
            <InputNumber />
          </Form.Item>

          <Form.Item
            name="ten"
            label={fl('ten', 'Tên tài khoản')}
            className="mb-3"
            rules={[
              { required: true, message: "Vui lòng nhập tên tài khoản" },
              { max: 200, message: "Tối đa 200 ký tự" },
            ]}
          >
            <Input placeholder="VD: Tiền mặt" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="loai"
                label={fl('loai', 'Loại tài khoản')}
                className="mb-3"
                rules={[{ required: true, message: "Vui lòng chọn loại" }]}
              >
                <Select
                  placeholder="Chọn loại"
                  options={loaiTaiKhoan}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="nhom"
                label={fl('nhom', 'Nhóm tài khoản')}
                className="mb-3"
                rules={[{ required: true, message: "Vui lòng chọn nhóm" }]}
              >
                <Select
                  placeholder="Chọn nhóm"
                  options={nhomTaiKhoan}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="chiTietTheo"
            label={fl('chiTietTheo', 'Chi tiết theo')}
            className="mb-3"
            tooltip="Khi nhập số dư đầu kỳ, TK này sẽ nhập chi tiết theo từng đối tượng"
          >
            <Select
              allowClear
              placeholder="— Không chi tiết —"
              options={chiTietTheoOptions}
            />
          </Form.Item>

          <Form.Item label="Quy tắc nhập chứng từ" className="mb-3"
            tooltip="Bắt buộc: không cho lưu chứng từ nếu thiếu. Cảnh báo: hỏi xác nhận rồi vẫn cho lưu.">
            <Row gutter={[8, 4]}>
              {FIELD_RULE_FIELDS.map((f) => (
                <Col span={12} key={f.key}>
                  <div className="flex items-center justify-between gap-2">
                    <Text className="text-xs">{f.label}</Text>
                    <Form.Item name={["fieldRules", f.key]} noStyle>
                      <Select
                        size="small"
                        allowClear
                        placeholder="Không bắt buộc"
                        style={{ width: 130 }}
                        options={fieldRuleLevelOptions}
                      />
                    </Form.Item>
                  </div>
                </Col>
              ))}
            </Row>
          </Form.Item>

          <Form.Item
            name="moTa"
            label={fl('moTa', 'Mô tả')}
            className="mb-0"
            rules={[{ max: 500, message: "Tối đa 500 ký tự" }]}
          >
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="Mô tả chi tiết về tài khoản"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TaiKhoanPage;
