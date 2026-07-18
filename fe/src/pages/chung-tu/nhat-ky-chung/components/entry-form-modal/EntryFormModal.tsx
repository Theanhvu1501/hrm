import { useState, useEffect } from "react";
import { Modal, Form, Spin, Alert, Button, Checkbox } from "antd";
import {
  FileTextOutlined,
  WalletOutlined,
  ExclamationCircleOutlined,
  DownOutlined,
  UpOutlined,
} from "@ant-design/icons";
import {
  useNhatKyChungState,
  useNhatKyChungHandler,
} from "../../NhatKyChungHandlerContext";
import { BasicInfoFields } from "./BasicInfoFields";
import { AccountingFields } from "./AccountingFields";
import { AllocationFields } from "./AllocationFields";
import {
  MasterDataChanges,
  FIELD_LABELS,
} from "../../handler/sub-handler/master-data-compare/master-data-compare.types";
import "./EntryFormModal.state";

export function EntryFormModal() {
  const handler = useNhatKyChungHandler();
  const [visible] = useNhatKyChungState("formModalVisible", false);
  const [editingEntry] = useNhatKyChungState("editingEntry", null);
  const [loading] = useNhatKyChungState("formLoading", false);
  const [masterDataLoading] = useNhatKyChungState("masterDataLoading", false);
  const [masterDataChanges] = useNhatKyChungState("masterDataChanges", {});
  const [hasChanges] = useNhatKyChungState("hasChanges", false);
  const [showUpdateConfirmModal] = useNhatKyChungState(
    "showUpdateConfirmModal",
    false
  );
  const [form] = Form.useForm();
  const [expandChanges, setExpandChanges] = useState(false);
  const [selectedUpdates, setSelectedUpdates] = useState<Record<string, boolean>>({});

  const isEditing = !!editingEntry;

  // Initialize selected updates when modal opens
  useEffect(() => {
    if (showUpdateConfirmModal && masterDataChanges) {
      const initial: Record<string, boolean> = {};
      Object.keys(masterDataChanges as MasterDataChanges).forEach((key) => {
        initial[key] = true; // Default: update all
      });
      setSelectedUpdates(initial);
    }
  }, [showUpdateConfirmModal, masterDataChanges]);

  const handleCancel = () => {
    form.resetFields();
    handler.executeEvent("closeFormModal", {});
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await handler.executeEvent("submitForm", { values });
      // form.resetFields();
    } catch {
      // Form validation error - handled by antd
    }
  };

  const handleConfirmUpdate = () => {
    handler.executeEvent("confirmMasterDataUpdateSelective", { selectedUpdates });
    form.resetFields();
  };

  const handleNoChange = () => {
    // Keep all original values - don't update any master data
    const noneSelected: Record<string, boolean> = {};
    Object.keys(masterDataChanges as MasterDataChanges).forEach((key) => {
      noneSelected[key] = false;
    });
    handler.executeEvent("confirmMasterDataUpdateSelective", { selectedUpdates: noneSelected });
    form.resetFields();
  };

  const handleCancelConfirm = () => {
    // Only close confirm modal, keep form values
    handler.executeEvent("hideUpdateConfirm", {});
  };

  // Initialize form values when modal opens
  const handleAfterOpenChange = async (open: boolean) => {
    if (open) {
      const formValues = await handler.executeEvent("initFormValues", {});
      if (formValues && Object.keys(formValues).length > 0) {
        form.setFieldsValue(formValues);
      }
    }
  };

  const modalTitle = (
    <div className="flex items-center gap-2">
      {isEditing ? (
        <>
          <FileTextOutlined className="text-primary" />
          <span>Sửa bút toán</span>
        </>
      ) : (
        <>
          <WalletOutlined className="text-primary" />
          <span>Tạo bút toán mới</span>
        </>
      )}
    </div>
  );

  // Render change alerts
  const renderChangeAlerts = () => {
    if (!hasChanges) return null;

    const changeItems: string[] = [];
    Object.entries(masterDataChanges as MasterDataChanges).forEach(
      ([key, change]) => {
        if (change.status === "deleted") {
          changeItems.push(
            `${FIELD_LABELS[key]}: "${change.oldValue}" đã bị xóa`
          );
        } else if (change.status === "changed") {
          changeItems.push(
            `${FIELD_LABELS[key]}: "${change.oldValue}" → "${change.newValue}"`
          );
        }
      }
    );

    const visibleItems = expandChanges ? changeItems : changeItems.slice(0, 2);
    const hasMore = changeItems.length > 2;

    return (
      <Alert
        type="warning"
        showIcon
        icon={<ExclamationCircleOutlined />}
        description={
          <div>
            <strong>Danh mục đã thay đổi</strong>
            <ul className="list-disc pl-4 mt-1">
              {visibleItems.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
            {hasMore && (
              <Button
                type="link"
                size="small"
                className="p-0 mt-1"
                onClick={() => setExpandChanges(!expandChanges)}
                icon={expandChanges ? <UpOutlined /> : <DownOutlined />}
              >
                {expandChanges
                  ? "Thu gọn"
                  : `Xem thêm ${changeItems.length - 2} thay đổi`}
              </Button>
            )}
          </div>
        }
        className="mb-4"
      />
    );
  };

  return (
    <>
      <Modal
        title={modalTitle}
        open={visible}
        onCancel={handleCancel}
        onOk={handleSubmit}
        okText={isEditing ? "Cập nhật" : "Tạo bút toán"}
        cancelText="Hủy"
        width={850}
        confirmLoading={loading}
        afterOpenChange={handleAfterOpenChange}
        style={{ top: 20 }}
        styles={{
          body: { maxHeight: "calc(100vh - 150px)", overflowY: "auto", overflowX: "hidden", padding: "12px 24px" },
        }}
      >
        <Spin spinning={masterDataLoading}>
          {isEditing && renderChangeAlerts()}
          <Form form={form} layout="vertical" className="compact-form" preserve={true} size="small">
            <BasicInfoFields isEditing={isEditing} form={form} />
            <AccountingFields form={form} />
            <AllocationFields form={form} />
          </Form>
        </Spin>
      </Modal>

      {/* Confirmation modal for master data changes */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <ExclamationCircleOutlined className="text-yellow-500" />
            <span>Xác nhận cập nhật danh mục</span>
          </div>
        }
        open={showUpdateConfirmModal}
        onCancel={handleCancelConfirm}
        centered
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={handleCancelConfirm}>Hủy</Button>
            <Button onClick={handleNoChange}>Không thay đổi</Button>
            <Button type="primary" onClick={handleConfirmUpdate}>
              Xác nhận
            </Button>
          </div>
        }
      >
        <p>Một số danh mục đã thay đổi so với lúc tạo bút toán.</p>
        <p className="text-gray-500 text-sm mb-2">
          Tích chọn các mục muốn cập nhật theo giá trị mới:
        </p>
        <div className="space-y-2">
          {Object.entries(masterDataChanges as MasterDataChanges).map(
            ([key, change]) => (
              <div
                key={key}
                className="flex items-start gap-2 p-2 rounded bg-gray-50"
              >
                <Checkbox
                  checked={selectedUpdates[key] ?? true}
                  onChange={(e) =>
                    setSelectedUpdates((prev) => ({
                      ...prev,
                      [key]: e.target.checked,
                    }))
                  }
                  disabled={change.status === "deleted"}
                />
                <div className="flex-1">
                  <strong>{FIELD_LABELS[key]}:</strong>{" "}
                  {change.status === "deleted" ? (
                    <span className="text-red-500">
                      "{change.oldValue}" đã bị xóa
                    </span>
                  ) : (
                    <span>
                      <span className="text-gray-500 line-through">
                        {change.oldValue}
                      </span>
                      {" → "}
                      <span className="text-green-600">{change.newValue}</span>
                    </span>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </Modal>
    </>
  );
}
