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
  BankOutlined,
} from "@ant-design/icons";
import { ChuDauTu } from "@/types";
import {
  ChuDauTuHandlerProvider,
  useChuDauTuHandler,
  useChuDauTuState,
} from "./ChuDauTuHandlerContext";
import "./ChuDauTuPage.state";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useBulkDelete } from "@/components/table/useBulkDelete";
import { chuDauTuService } from "@/services/chuDauTuService";
import { FilterBar } from "@/components/common/FilterBar";
import { useTerm } from "@/contexts/TermContext";
import { useTableTitleConfig } from "@/components/glossary/useTableTitleConfig";
import { useFieldLabels } from "@/components/glossary/useFieldLabels";

const { Title, Text } = Typography;

function ChuDauTuPageInner() {
  const { canCreate, canEdit, canDelete, canExport } = usePagePermission("/danh-muc/chu-dau-tu");
  const { t } = useTerm();
  const fl = useFieldLabels('danhMuc.chuDauTu');
  const handler = useChuDauTuHandler();
  const [data] = useChuDauTuState("data", []);
  const [loading] = useChuDauTuState("loading", false);
  const [pagination] = useChuDauTuState("pagination", {
    current: 1,
    pageSize: 50,
    total: 0,
  });
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ChuDauTu | null>(null);
  const [form] = Form.useForm();

  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<ChuDauTu>({
    enabled: canDelete,
    itemLabel: "chủ đầu tư",
    onDeleteBatch: (ids) => chuDauTuService.deleteBatch(ids),
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

  const openModal = (record?: ChuDauTu) => {
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
      title: `Tên ${t("chuDauTu")}`,
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
      render: (_: any, record: ChuDauTu) => (
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
            description="Bạn có chắc chắn muốn xóa?"
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

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('danhMuc.chuDauTu', columns);

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
          { title: t("chuDauTu") },
        ]}
      />

      {/* <div className="page-header p-6 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <BankOutlined className="text-2xl" />
            <Title level={3} className="!text-white !mb-0">Danh mục Chủ đầu tư</Title>
          </div>
          <Text className="text-white/80">Quản lý danh sách chủ đầu tư</Text>
        </div>
      </div> */}

      <Card className="shadow-sm">
        <FilterBar
          search={{
            value: searchText,
            onChange: setSearchText,
            onSearch: () => handleSearch(searchText),
            placeholder: "Tìm kiếm theo mã, tên...",
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
          scroll={{ y: "calc(100vh - 285px)" }}
          size="middle"
        />
      </Card>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <BankOutlined className="text-primary" />
            <span>
              {editingRecord ? `Sửa ${t("chuDauTu")}` : `Thêm ${t("chuDauTu")} mới`}
            </span>
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
            rules={[
              { required: true, message: "Vui lòng nhập mã" },
              { max: 20, message: "Tối đa 20 ký tự" },
            ]}
            className="mb-3"
          >
            <Input placeholder="VD: CDT001" />
          </Form.Item>
          <Form.Item
            name="ten"
            label={`Tên ${t("chuDauTu")}`}
            rules={[
              { required: true, message: "Vui lòng nhập tên" },
              { max: 200, message: "Tối đa 200 ký tự" },
            ]}
            className="mb-3"
          >
            <Input placeholder="VD: Công ty ABC" />
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

export default function ChuDauTuPage() {
  return (
    <ChuDauTuHandlerProvider>
      <ChuDauTuPageInner />
    </ChuDauTuHandlerProvider>
  );
}
