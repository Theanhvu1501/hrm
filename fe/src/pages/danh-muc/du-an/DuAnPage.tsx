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
  Statistic,
  DatePicker,
  Tabs,
  Progress,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ReloadOutlined,
  ProjectOutlined,
  HomeOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  PauseCircleOutlined,
  CalendarOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { DuAn, ChuDauTu } from "@/types";
import { duAnService, DuAnStats } from "@/services/duAnService";
import { chuDauTuService } from "@/services/chuDauTuService";
import { trangThaiDuAnOptions } from "@/mock-data/du-an";
import { z } from "zod";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useBulkDelete } from "@/components/table/useBulkDelete";
import { FilterBar } from "@/components/common/FilterBar";
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';

const { Text } = Typography;
const { RangePicker } = DatePicker;

// Validation schema
const duAnSchema = z.object({
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
  chuDauTuId: z.string().optional().nullable(),
  trangThai: z.enum(["DANG_THUC_HIEN", "HOAN_THANH", "TAM_DUNG"]),
});

const DuAnPage: React.FC = () => {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/danh-muc/du-an");
  const [data, setData] = useState<DuAn[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DuAn | null>(null);
  const [form] = Form.useForm();
  const [stats, setStats] = useState<DuAnStats>({
    tongDuAn: 0,
    dangThucHien: 0,
    hoanThanh: 0,
    tamDung: 0,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });
  const [chuDauTuList, setChuDauTuList] = useState<ChuDauTu[]>([]);

  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<DuAn>({
    enabled: canDelete,
    itemLabel: "dự án",
    onDeleteBatch: (ids) => duAnService.deleteBatch(ids),
    onDone: () => fetchData(),
  });

  const fetchData = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    search = searchText,
    trangThai?: DuAn["trangThai"]
  ) => {
    // Lựa chọn chỉ có hiệu lực trong trang đang xem: đổi trang / tìm kiếm / lọc / tải lại đều bỏ chọn.
    clearSelection();
    setLoading(true);
    try {
      const [result, statsData, chuDauTuData] = await Promise.all([
        duAnService.getPaginated({
          page,
          limit: pageSize,
          search: search || undefined,
          trangThai,
        }),
        duAnService.getStats(),
        chuDauTuService.getAll(),
      ]);
      setData(result.data);
      setPagination({
        current: result.meta.page,
        pageSize: result.meta.limit,
        total: result.meta.total,
      });
      setStats(statsData);
      setChuDauTuList(chuDauTuData);
    } catch (error) {
      message.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(
      1,
      pagination.pageSize,
      "",
      activeTab === "all" ? undefined : (activeTab as DuAn["trangThai"])
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setSearchText("");
    fetchData(
      1,
      pagination.pageSize,
      "",
      key === "all" ? undefined : (key as DuAn["trangThai"])
    );
  };

  const handleTableChange = (paginationConfig: {
    current?: number;
    pageSize?: number;
  }) => {
    fetchData(
      paginationConfig.current || 1,
      paginationConfig.pageSize || 10,
      searchText,
      activeTab === "all" ? undefined : (activeTab as DuAn["trangThai"])
    );
  };

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ trangThai: "DANG_THUC_HIEN" });
    setModalVisible(true);
  };

  const handleEdit = (record: DuAn) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      chuDauTuId: record.chuDauTuId,
      thoiGian:
        record.ngayBatDau && record.ngayKetThuc
          ? [dayjs(record.ngayBatDau), dayjs(record.ngayKetThuc)]
          : undefined,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Extract dates from RangePicker
      const ngayBatDau = values.thoiGian?.[0]?.format("YYYY-MM-DD");
      const ngayKetThuc = values.thoiGian?.[1]?.format("YYYY-MM-DD");

      // Get chuDauTu info from selected id
      const selectedChuDauTu = chuDauTuList.find(
        (cdt) => cdt.id === values.chuDauTuId
      );

      const submitData = {
        ma: values.ma,
        ten: values.ten,
        chuDauTuId: values.chuDauTuId,
        chuDuAnMa: selectedChuDauTu?.ma,
        chuDuAn: selectedChuDauTu?.ten,
        trangThai: values.trangThai,
        ngayBatDau,
        ngayKetThuc,
      };

      // Validate with zod
      duAnSchema.parse(submitData);

      // Check if ma already exists
      const maExists = await duAnService.checkMaExists(
        submitData.ma,
        editingRecord?.id
      );
      if (maExists) {
        message.error("Mã dự án đã tồn tại");
        return;
      }

      if (editingRecord) {
        await duAnService.update(editingRecord.id, submitData);
        message.success("Cập nhật dự án thành công");
      } else {
        await duAnService.create(submitData as Omit<DuAn, "id">);
        message.success("Thêm dự án thành công");
      }

      setModalVisible(false);
      fetchData(
        pagination.current,
        pagination.pageSize,
        searchText,
        activeTab === "all" ? undefined : (activeTab as DuAn["trangThai"])
      );
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
      await duAnService.remove(id);
      message.success("Xóa dự án thành công");
      fetchData(
        pagination.current,
        pagination.pageSize,
        searchText,
        activeTab === "all" ? undefined : (activeTab as DuAn["trangThai"])
      );
    } catch (error) {
      message.error("Không thể xóa dự án");
    }
  };

  const handleUpdateTrangThai = async (
    id: string,
    trangThai: DuAn["trangThai"]
  ) => {
    try {
      await duAnService.updateTrangThai(id, trangThai);
      message.success("Cập nhật trạng thái thành công");
      fetchData(
        pagination.current,
        pagination.pageSize,
        searchText,
        activeTab === "all" ? undefined : (activeTab as DuAn["trangThai"])
      );
    } catch (error) {
      message.error("Không thể cập nhật trạng thái");
    }
  };

  const getTrangThaiTag = (trangThai: DuAn["trangThai"]) => {
    const option = trangThaiDuAnOptions.find((o) => o.value === trangThai);
    const icons = {
      DANG_THUC_HIEN: <PlayCircleOutlined />,
      HOAN_THANH: <CheckCircleOutlined />,
      TAM_DUNG: <PauseCircleOutlined />,
    };
    return (
      <Tag color={option?.color} icon={icons[trangThai]}>
        {option?.label}
      </Tag>
    );
  };

  const calculateProgress = (ngayBatDau?: string, ngayKetThuc?: string) => {
    if (!ngayBatDau || !ngayKetThuc) return null;

    const start = dayjs(ngayBatDau);
    const end = dayjs(ngayKetThuc);
    const now = dayjs();

    if (now.isBefore(start)) return 0;
    if (now.isAfter(end)) return 100;

    const total = end.diff(start, "day");
    const elapsed = now.diff(start, "day");
    return Math.round((elapsed / total) * 100);
  };

  const columns = [
    {
      title: "Mã DA",
      dataIndex: "ma",
      key: "ma",
      width: 100,
      sorter: (a: DuAn, b: DuAn) => a.ma.localeCompare(b.ma),
      render: (text: string) => (
        <Text strong className="text-primary">
          {text}
        </Text>
      ),
    },
    {
      title: "Tên dự án",
      dataIndex: "ten",
      key: "ten",
      ellipsis: true,
      sorter: (a: DuAn, b: DuAn) => a.ten.localeCompare(b.ten),
    },
    {
      title: "Chủ đầu tư",
      dataIndex: "chuDuAn",
      key: "chuDuAn",
      width: 180,
      ellipsis: true,
      render: (text: string) => (
        <Space>
          <UserOutlined className="text-muted-foreground" />
          <Text>{text || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Thời gian",
      key: "thoiGian",
      width: 200,
      render: (_: unknown, record: DuAn) => (
        <div>
          <Space className="text-xs">
            <CalendarOutlined className="text-muted-foreground" />
            <Text type="secondary">
              {record.ngayBatDau
                ? dayjs(record.ngayBatDau).format("DD/MM/YYYY")
                : "-"}
              {" → "}
              {record.ngayKetThuc
                ? dayjs(record.ngayKetThuc).format("DD/MM/YYYY")
                : "-"}
            </Text>
          </Space>
          {record.trangThai === "DANG_THUC_HIEN" && (
            <Progress
              percent={
                calculateProgress(record.ngayBatDau, record.ngayKetThuc) || 0
              }
              size="small"
              className="mt-1"
            />
          )}
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "trangThai",
      key: "trangThai",
      width: 150,
      render: (trangThai: DuAn["trangThai"], record: DuAn) => (
        <Select
          value={trangThai}
          onChange={(value) => handleUpdateTrangThai(record.id, value)}
          style={{ width: 140 }}
          options={trangThaiDuAnOptions.map((o) => ({
            value: o.value,
            label: getTrangThaiTag(o.value as DuAn["trangThai"]),
          }))}
          bordered={false}
        />
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 100,
      fixed: "right" as const,
      render: (_: unknown, record: DuAn) => (
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
            description="Bạn có chắc chắn muốn xóa dự án này?"
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

  const fl = useFieldLabels('danhMuc.duAn');
  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('danhMuc.duAn', columns);

  const tabItems = [
    {
      key: "all",
      label: (
        <span>
          Tất cả <Tag className="ml-1">{stats.tongDuAn}</Tag>
        </span>
      ),
    },
    {
      key: "DANG_THUC_HIEN",
      label: (
        <span>
          <PlayCircleOutlined className="mr-1" />
          Đang thực hiện{" "}
          <Tag color="processing" className="ml-1">
            {stats.dangThucHien}
          </Tag>
        </span>
      ),
    },
    {
      key: "HOAN_THANH",
      label: (
        <span>
          <CheckCircleOutlined className="mr-1" />
          Hoàn thành{" "}
          <Tag color="success" className="ml-1">
            {stats.hoanThanh}
          </Tag>
        </span>
      ),
    },
    {
      key: "TAM_DUNG",
      label: (
        <span>
          <PauseCircleOutlined className="mr-1" />
          Tạm dừng{" "}
          <Tag color="warning" className="ml-1">
            {stats.tamDung}
          </Tag>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { href: "/", title: <HomeOutlined /> },
          { title: "Danh mục" },
          { title: "Dự án" },
        ]}
      />

      {/* Stats Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <Card className="stat-card">
            <Statistic
              title="Tổng dự án"
              value={stats.tongDuAn}
              prefix={<ProjectOutlined className="text-primary" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="stat-card">
            <Statistic
              title="Đang thực hiện"
              value={stats.dangThucHien}
              prefix={<PlayCircleOutlined className="text-blue-500" />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="stat-card stat-card-success">
            <Statistic
              title="Hoàn thành"
              value={stats.hoanThanh}
              prefix={<CheckCircleOutlined className="text-green-500" />}
              valueStyle={{ color: "#22c55e" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="stat-card stat-card-warning">
            <Statistic
              title="Tạm dừng"
              value={stats.tamDung}
              prefix={<PauseCircleOutlined className="text-orange-500" />}
              valueStyle={{ color: "#f97316" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Table with Tabs */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          className="mb-4"
        />

        <FilterBar
          search={{
            value: searchText,
            onChange: setSearchText,
            onSearch: () =>
              fetchData(
                1,
                pagination.pageSize,
                searchText,
                activeTab === "all"
                  ? undefined
                  : (activeTab as DuAn["trangThai"])
              ),
            placeholder: "Tìm kiếm theo mã, tên dự án hoặc chủ đầu tư...",
            width: 300,
          }}
          onReset={() => {
            setSearchText("");
            fetchData(
              1,
              pagination.pageSize,
              "",
              activeTab === "all" ? undefined : (activeTab as DuAn["trangThai"])
            );
          }}
          actions={
            <>
              {settingsButton}
              {canExport && (
                <Button icon={<ExportOutlined />}>Xuất Excel</Button>
              )}
              <Button
                icon={<ReloadOutlined />}
                onClick={() =>
                  fetchData(
                    1,
                    pagination.pageSize,
                    "",
                    activeTab === "all"
                      ? undefined
                      : (activeTab as DuAn["trangThai"])
                  )
                }
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
                  Thêm dự án
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
              `${range[0]}-${range[1]} của ${total} dự án`,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          onChange={(pag) =>
            handleTableChange({ current: pag.current, pageSize: pag.pageSize })
          }
        />
      </Card>

      {/* Modal */}
      <Modal
        title={editingRecord ? "Sửa dự án" : "Thêm dự án mới"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={550}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-2" size="small">
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                name="ma"
                label={fl('ma', 'Mã dự án')}
                rules={[
                  { required: true, message: "Vui lòng nhập mã dự án" },
                  { max: 20, message: "Mã tối đa 20 ký tự" },
                ]}
                className="mb-3"
              >
                <Input placeholder="VD: DA001" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="ten"
                label={fl('ten', 'Tên dự án')}
                rules={[
                  { required: true, message: "Vui lòng nhập tên dự án" },
                  { max: 200, message: "Tên tối đa 200 ký tự" },
                ]}
                className="mb-3"
              >
                <Input placeholder="Nhập tên dự án" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="chuDauTuId" label={fl('chuDauTuId', 'Chủ đầu tư')} className="mb-3">
            <Select
              showSearch
              allowClear
              placeholder="Chọn chủ đầu tư"
              optionFilterProp="label"
              options={chuDauTuList.map((cdt) => ({
                value: cdt.id,
                label: `${cdt.ma} - ${cdt.ten}`,
              }))}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={14}>
              <Form.Item
                name="thoiGian"
                label={fl('thoiGian', 'Thời gian thực hiện')}
                className="mb-0"
              >
                <RangePicker
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                  placeholder={["Ngày bắt đầu", "Ngày kết thúc"]}
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="trangThai"
                label={fl('trangThai', 'Trạng thái')}
                rules={[
                  { required: true, message: "Vui lòng chọn trạng thái" },
                ]}
                className="mb-0"
              >
                <Select
                  placeholder="Chọn trạng thái"
                  options={trangThaiDuAnOptions.map((o) => ({
                    value: o.value,
                    label: <Tag color={o.color}>{o.label}</Tag>,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default DuAnPage;
