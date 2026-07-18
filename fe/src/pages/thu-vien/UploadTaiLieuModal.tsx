import React, { useState } from "react";
import { Modal, Tabs, Form, Input, Upload, Button, message } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd/es/upload/interface";
import { taiLieuService } from "@/services/taiLieuService";

const { TextArea } = Input;
const { Dragger } = Upload;

const ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx";

interface UploadTaiLieuModalProps {
  open: boolean;
  category: string;
  onClose: () => void;
  onSuccess: () => void;
}

const UploadTaiLieuModal: React.FC<UploadTaiLieuModalProps> = ({
  open,
  category,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState("file");
  const [submitting, setSubmitting] = useState(false);
  const [fileForm] = Form.useForm();
  const [youtubeForm] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const reset = () => {
    fileForm.resetFields();
    youtubeForm.resetFields();
    setFileList([]);
    setActiveTab("file");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (activeTab === "file") {
        const values = await fileForm.validateFields();
        const file = fileList[0]?.originFileObj as File | undefined;
        if (!file) {
          message.error("Vui lòng chọn file");
          setSubmitting(false);
          return;
        }
        await taiLieuService.uploadFile({
          category,
          title: values.title,
          moTa: values.moTa,
          file,
        });
        message.success("Tải lên thành công");
      } else {
        const values = await youtubeForm.validateFields();
        await taiLieuService.addYoutube({
          category,
          title: values.title,
          moTa: values.moTa,
          youtubeUrl: values.youtubeUrl,
        });
        message.success("Thêm link YouTube thành công");
      }
      reset();
      onSuccess();
    } catch (err) {
      if (err && (err as { errorFields?: unknown }).errorFields) {
        // lỗi validate form — bỏ qua
      } else {
        message.error("Không thể lưu tài liệu");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Tải lên tài liệu"
      open={open}
      onCancel={handleClose}
      onOk={handleSubmit}
      okText="Lưu"
      cancelText="Hủy"
      width={560}
      confirmLoading={submitting}
      destroyOnClose
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "file",
            label: "Tải file",
            children: (
              <Form form={fileForm} layout="vertical" size="small">
                <Form.Item
                  name="title"
                  label="Tiêu đề"
                  rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}
                >
                  <Input placeholder="Nhập tiêu đề" />
                </Form.Item>
                <Form.Item name="moTa" label="Mô tả">
                  <TextArea
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    placeholder="Nhập mô tả (tuỳ chọn)"
                  />
                </Form.Item>
                <Form.Item label="Tệp" required>
                  <Dragger
                    accept={ACCEPT}
                    maxCount={1}
                    fileList={fileList}
                    beforeUpload={() => false}
                    onChange={({ fileList: fl }) => setFileList(fl.slice(-1))}
                    onRemove={() => setFileList([])}
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">
                      Kéo thả hoặc bấm để chọn file
                    </p>
                    <p className="ant-upload-hint">
                      PDF, ảnh, Word, Excel, PowerPoint (≤ 25MB)
                    </p>
                  </Dragger>
                </Form.Item>
              </Form>
            ),
          },
          {
            key: "youtube",
            label: "Link YouTube",
            children: (
              <Form form={youtubeForm} layout="vertical" size="small">
                <Form.Item
                  name="title"
                  label="Tiêu đề"
                  rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}
                >
                  <Input placeholder="Nhập tiêu đề" />
                </Form.Item>
                <Form.Item name="moTa" label="Mô tả">
                  <TextArea
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    placeholder="Nhập mô tả (tuỳ chọn)"
                  />
                </Form.Item>
                <Form.Item
                  name="youtubeUrl"
                  label="Link YouTube"
                  rules={[
                    { required: true, message: "Vui lòng nhập link YouTube" },
                  ]}
                >
                  <Input placeholder="https://www.youtube.com/watch?v=..." />
                </Form.Item>
              </Form>
            ),
          },
        ]}
      />
    </Modal>
  );
};

export default UploadTaiLieuModal;
