import { useEffect, useState } from "react";
import { Modal, Form, Input, InputNumber, Row, Col } from "antd";

interface Values { ma: string; ten: string; donVi?: string; giaBan?: number; }

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: Values) => Promise<boolean>;
}

export function QuickAddSanPhamModal({ open, onClose, onSubmit }: Props) {
  const [form] = Form.useForm<Values>();
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) form.resetFields(); }, [open, form]);

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
      title="Thêm nhanh sản phẩm"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Thêm"
      cancelText="Hủy"
      confirmLoading={saving}
      width={480}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" size="small" className="mt-2">
        <Form.Item name="ma" label="Mã sản phẩm" rules={[{ required: true, message: "Nhập mã" }, { max: 50, message: "Tối đa 50 ký tự" }]}>
          <Input placeholder="VD: SP001, VT001" />
        </Form.Item>
        <Form.Item name="ten" label="Tên sản phẩm" rules={[{ required: true, message: "Nhập tên" }, { max: 200, message: "Tối đa 200 ký tự" }]}>
          <Input placeholder="VD: Xi măng PCB40" />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="donVi" label="Đơn vị tính">
              <Input placeholder="VD: Cái, Kg, m³" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="giaBan" label="Giá bán (VNĐ)">
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(v) => (v ? Number(v.replace(/,/g, "")) : 0) as 0}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
