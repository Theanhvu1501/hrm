import { useEffect } from "react";
import { Modal, Form, Input, Switch } from "antd";
import { useVaiTroHandler, useVaiTroState } from "../../VaiTroHandlerContext";
import { VaiTroItem } from "../table/VaiTroTable.state";
import "./VaiTroModal.state";
import { useFieldLabels } from "@/components/glossary/useFieldLabels";

export function VaiTroModal() {
  const handler = useVaiTroHandler();
  const fl = useFieldLabels("cauHinh.vaiTro");
  const [modalVisible] = useVaiTroState("modalVisible", false);
  const [editingRecord] = useVaiTroState("editingRecord", null as VaiTroItem | null);
  const [form] = Form.useForm();

  const isEditing = !!editingRecord;

  useEffect(() => {
    if (modalVisible && editingRecord) {
      form.setFieldsValue({
        ten: editingRecord.ten,
        moTa: editingRecord.moTa,
        trangThai: editingRecord.trangThai === "HOAT_DONG",
      });
    } else if (modalVisible) {
      form.resetFields();
      form.setFieldsValue({ trangThai: true });
    }
  }, [modalVisible, editingRecord, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    const trangThai = values.trangThai ? "HOAT_DONG" : "KHOA";

    if (isEditing) {
      handler.executeEvent("updateVaiTro", {
        id: editingRecord.id,
        data: {
          ten: values.ten,
          moTa: values.moTa || "",
          trangThai,
        },
      });
    } else {
      handler.executeEvent("createVaiTro", {
        ten: values.ten,
        moTa: values.moTa || "",
        trangThai,
      });
    }
  };

  const handleCancel = () => {
    handler.executeEvent("closeModal", {});
  };

  return (
    <Modal
      title={isEditing ? "Sửa vai trò" : "Thêm vai trò"}
      open={modalVisible}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={isEditing ? "Cập nhật" : "Thêm"}
      cancelText="Huỷ"
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ trangThai: true }}>
        <Form.Item
          name="ten"
          label={fl("ten", "Tên vai trò")}
          rules={[{ required: true, message: "Vui lòng nhập tên vai trò" }]}
        >
          <Input placeholder="Nhập tên vai trò" />
        </Form.Item>

        <Form.Item name="moTa" label={fl("moTa", "Mô tả")}>
          <Input.TextArea rows={3} placeholder="Nhập mô tả vai trò" />
        </Form.Item>

        <Form.Item name="trangThai" label={fl("trangThai", "Trạng thái")} valuePropName="checked">
          <Switch checkedChildren="Hoạt động" unCheckedChildren="Khoá" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
