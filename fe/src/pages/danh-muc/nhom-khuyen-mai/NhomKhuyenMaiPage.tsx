import React, { useEffect, useState } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  message,
  Popconfirm,
  Tooltip,
  Typography,
  Breadcrumb,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
  GiftOutlined,
} from "@ant-design/icons";
import { NhomKhuyenMai } from "@/types";
import { FilterBar } from "@/components/common/FilterBar";
import {
  NhomKhuyenMaiHandlerProvider,
  useNhomKhuyenMaiHandler,
  useNhomKhuyenMaiState,
} from "./NhomKhuyenMaiHandlerContext";
import "./NhomKhuyenMaiPage.state";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useBulkDelete } from "@/components/table/useBulkDelete";
import { nhomKhuyenMaiService } from "@/services/nhomKhuyenMaiService";
import { useTableTitleConfig } from "@/components/glossary/useTableTitleConfig";
import { useFieldLabels } from "@/components/glossary/useFieldLabels";

const { Title, Text } = Typography;

function NhomKhuyenMaiPageInner() {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/danh-muc/nhom-khuyen-mai");
  const handler = useNhomKhuyenMaiHandler();
  const [data] = useNhomKhuyenMaiState("data", []);
  const [loading] = useNhomKhuyenMaiState("loading", false);
  const [pagination] = useNhomKhuyenMaiState("pagination", {
    current: 1,
    pageSize: 50,
    total: 0,
  });
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<NhomKhuyenMai | null>(
    null
  );
  const [form] = Form.useForm();

  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<NhomKhuyenMai>({
    enabled: canDelete,
    itemLabel: "nhóm khuyến mãi",
    onDeleteBatch: (ids) => nhomKhuyenMaiService.deleteBatch(ids),
    onDone: () => handler.executeEvent("refresh", {}),
  });

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  const handleSearch = (value: string) => {
    clearSelection();
    setSearchText(value);
    handler.executeEvent("search", { keyword: value });
  };

  const handleTableChange = (pag: { current?: number; pageSize?: number }) => {
    clearSelection();
    handler.executeEvent("changePage", {
      page: pag.current || 1,
      pageSize: pag.pageSize || 10,
    });
  };

  const openModal = (record?: NhomKhuyenMai) => {
    if (record) {
      setEditingRecord(record);
      form.setFieldsValue(record);
    } else {
      setEditingRecord(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingRecord) {
        await handler.executeEvent("update", {
          id: editingRecord.id,
          data: values,
        });
        message.success("Cập nhật thành công");
      } else {
        await handler.executeEvent("create", { data: values });
        message.success("Thêm mới thành công");
      }
      setModalVisible(false);
      form.resetFields();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error.message || "Có lỗi xảy ra");
    }
  };

  const handleDelete = async (id: string) => {
    clearSelection();
    try {
      await handler.executeEvent("remove", { id });
      message.success("Xóa thành công");
    } catch (error: any) {
      message.error(error.message || "Không thể xóa");
    }
  };

  const columns = [
    {
      title: "Mã",
      dataIndex: "ma",
      key: "ma",
      width: 150,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Tên nhóm khuyến mại",
      dataIndex: "ten",
      key: "ten",
      ellipsis: true,
    },
    {
      title: "Mô tả",
      dataIndex: "moTa",
      key: "moTa",
      ellipsis: true,
      render: (text: string) => <Text type="secondary">{text || "-"}</Text>,
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      align: "center" as const,
      render: (_: any, record: NhomKhuyenMai) => (
        <Space size="small">
          {canEdit && (<Tooltip title="Sửa">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openModal(record)}
            />
          </Tooltip>)}
          {canDelete && (<Popconfirm
            title="Xác nhận xóa"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa">
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                danger
              />
            </Tooltip>
          </Popconfirm>)}
        </Space>
      ),
    },
  ];

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('danhMuc.nhomKhuyenMai', columns);
  const fl = useFieldLabels('danhMuc.nhomKhuyenMai');

  return (
    <div className="space-y-3">
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
          { title: "Nhóm khuyến mại" },
        ]}
      />

      {/* <div className="page-header p-6 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <GiftOutlined className="text-2xl" />
            <Title level={3} className="!text-white !mb-0">Danh mục Nhóm khuyến mại</Title>
          </div>
          <Text className="text-white/80">Quản lý danh sách nhóm khuyến mại</Text>
        </div>
      </div> */}

      <Card className="shadow-sm">
        <FilterBar
          search={{
            value: searchText,
            onChange: setSearchText,
            onSearch: () => handleSearch(searchText),
            placeholder: "Tìm kiếm...",
            width: 300,
          }}
          onReset={() => {
            clearSelection();
            setSearchText("");
            handler.executeEvent("refresh", {});
          }}
          actions={
            <>
              {settingsButton}
              {bulkDeleteButton}
              {canCreate && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => openModal()}
                >
                  Thêm mới
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
          scroll={{ y: "calc(100vh - 285px)" }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} bản ghi`,
          }}
          onChange={(pag) =>
            handleTableChange({ current: pag.current, pageSize: pag.pageSize })
          }
          size="middle"
        />
      </Card>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <GiftOutlined className="text-primary" />
            <span>{editingRecord ? "Sửa" : "Thêm mới"}</span>
          </div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={450}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" className="mt-2" size="small">
          <Form.Item
            name="ma"
            label={fl('ma', 'Mã')}
            rules={[{ required: true, message: "Vui lòng nhập mã" }]}
            className="mb-3"
          >
            <Input placeholder="VD: NKM001" />
          </Form.Item>
          <Form.Item
            name="ten"
            label={fl('ten', 'Tên')}
            rules={[{ required: true, message: "Vui lòng nhập tên" }]}
            className="mb-3"
          >
            <Input placeholder="VD: Khuyến mại mùa hè" />
          </Form.Item>
          <Form.Item name="moTa" label={fl('moTa', 'Mô tả')} className="mb-0">
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="Mô tả..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default function NhomKhuyenMaiPage() {
  return (
    <NhomKhuyenMaiHandlerProvider>
      <NhomKhuyenMaiPageInner />
    </NhomKhuyenMaiHandlerProvider>
  );
}
