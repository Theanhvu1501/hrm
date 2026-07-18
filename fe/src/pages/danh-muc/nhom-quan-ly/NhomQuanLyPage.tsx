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
  TeamOutlined,
} from "@ant-design/icons";
import { NhomQuanLy } from "@/types";
import { FilterBar } from "@/components/common/FilterBar";
import {
  NhomQuanLyHandlerProvider,
  useNhomQuanLyHandler,
  useNhomQuanLyState,
} from "./NhomQuanLyHandlerContext";
import "./NhomQuanLyPage.state";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useBulkDelete } from "@/components/table/useBulkDelete";
import { nhomQuanLyService } from "@/services/nhomQuanLyService";
import { useTableTitleConfig } from "@/components/glossary/useTableTitleConfig";
import { useFieldLabels } from "@/components/glossary/useFieldLabels";

const { Title, Text } = Typography;

function NhomQuanLyPageInner() {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/danh-muc/nhom-quan-ly");
  const handler = useNhomQuanLyHandler();
  const [data] = useNhomQuanLyState("data", []);
  const [loading] = useNhomQuanLyState("loading", false);
  const [pagination] = useNhomQuanLyState("pagination", {
    current: 1,
    pageSize: 50,
    total: 0,
  });
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<NhomQuanLy | null>(null);
  const [form] = Form.useForm();

  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<NhomQuanLy>({
    enabled: canDelete,
    itemLabel: "nhóm quản lý",
    onDeleteBatch: (ids) => nhomQuanLyService.deleteBatch(ids),
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

  const openModal = (record?: NhomQuanLy) => {
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
      title: "Tên nhóm quản lý",
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
      render: (_: any, record: NhomQuanLy) => (
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

  const fl = useFieldLabels('danhMuc.nhomQuanLy');
  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('danhMuc.nhomQuanLy', columns);

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
          { title: "Nhóm quản lý" },
        ]}
      />

      {/* <div className="page-header p-6 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <TeamOutlined className="text-2xl" />
            <Title level={3} className="!text-white !mb-0">Danh mục Nhóm quản lý</Title>
          </div>
          <Text className="text-white/80">Quản lý danh sách nhóm quản lý</Text>
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
            <TeamOutlined className="text-primary" />
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
            <Input placeholder="VD: NQL001" />
          </Form.Item>
          <Form.Item
            name="ten"
            label={fl('ten', 'Tên')}
            rules={[{ required: true, message: "Vui lòng nhập tên" }]}
            className="mb-3"
          >
            <Input placeholder="VD: Nhóm quản lý A" />
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

export default function NhomQuanLyPage() {
  return (
    <NhomQuanLyHandlerProvider>
      <NhomQuanLyPageInner />
    </NhomQuanLyHandlerProvider>
  );
}
