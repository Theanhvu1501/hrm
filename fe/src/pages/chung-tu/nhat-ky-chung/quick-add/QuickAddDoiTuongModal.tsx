import { useEffect, useState } from "react";
import { Modal, Form, Input, Select } from "antd";
import { loaiDoiTuong } from "@/mock-data/doi-tuong";

interface Values { loai: string[]; ma: string; ten: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  defaultLoai?: string[];
  onSubmit: (values: Values) => Promise<boolean>;
}

export function QuickAddDoiTuongModal({ open, onClose, defaultLoai, onSubmit }: Props) {
  const [form] = Form.useForm<Values>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      form.resetFields();
      if (defaultLoai?.length) {
        form.setFieldsValue({ loai: defaultLoai });
      }
    }
  }, [open, defaultLoai, form]);

  const handleOk = async () => {
    let v: Values;
    try { v = await form.validateFields(); } catch { return; }
    setSaving(true);
    try {
      const ok = await onSubmit(v);
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Thêm nhanh đối tượng"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Thêm"
      cancelText="Hủy"
      confirmLoading={saving}
      width={460}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" size="small" className="mt-2">
        <Form.Item name="loai" label="Loại đối tượng" rules={[{ required: true, message: "Chọn loại" }]}>
          <Select mode="multiple" placeholder="Chọn loại" options={loaiDoiTuong} />
        </Form.Item>
        <Form.Item name="ma" label="Mã đối tượng" rules={[{ required: true, message: "Nhập mã" }, { max: 20, message: "Tối đa 20 ký tự" }]}>
          <Input placeholder="VD: KH001, NCC001" />
        </Form.Item>
        <Form.Item name="ten" label="Tên đối tượng" rules={[{ required: true, message: "Nhập tên" }, { max: 200, message: "Tối đa 200 ký tự" }]}>
          <Input placeholder="Tên đối tượng (VD: Công ty TNHH ABC)" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
