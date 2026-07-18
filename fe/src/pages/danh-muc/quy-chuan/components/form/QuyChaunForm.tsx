import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Row, Col, message } from 'antd';
import { z } from 'zod';
import { quyChauanService } from '@/services/quyChaunService';
import { taiKhoanService } from '@/services/taiKhoanService';
import { useQuyChaunHandler, useQuyChaunState } from '../../QuyChaunHandlerContext';
import { LoaiGiaoDich, HoSoChungTuRef } from '@/types';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';
import './QuyChaunForm.state';

const quyChaunSchema = z.object({
  loaiGiaoDich: z.string().min(1, 'Vui lòng chọn loại giao dịch'),
  nghiepVu: z.string().min(1, 'Vui lòng nhập nghiệp vụ').max(100, 'Nghiệp vụ không quá 100 ký tự'),
  taiKhoanNo: z.string().min(1, 'Vui lòng chọn tài khoản Nợ'),
  taiKhoanCo: z.string().min(1, 'Vui lòng chọn tài khoản Có'),
  moTa: z.string().max(255, 'Mô tả không quá 255 ký tự').optional().nullable(),
});

export const QuyChaunForm: React.FC = () => {
  const handler = useQuyChaunHandler();
  const fl = useFieldLabels('danhMuc.quyChuan');
  const [modalVisible] = useQuyChaunState('modalVisible', false);
  const [editingRecord] = useQuyChaunState('editingRecord', null);
  const [formLoading] = useQuyChaunState('formLoading', false);
  const [loaiGiaoDichList] = useQuyChaunState('loaiGiaoDichList', [] as LoaiGiaoDich[]);
  const [hoSoChungTuList] = useQuyChaunState('hoSoChungTuList', [] as HoSoChungTuRef[]);
  const [form] = Form.useForm();
  const [taiKhoanOptions, setTaiKhoanOptions] = useState<{ value: string; label: string }[]>([]);

  // Load leaf accounts when modal opens
  useEffect(() => {
    if (modalVisible) {
      taiKhoanService.getLeafAccounts().then((accounts) => {
        const options = accounts.map((tk) => ({
          value: tk.ma,
          label: `${tk.ma} - ${tk.ten}`,
        }));
        setTaiKhoanOptions(options);
      });
    }
  }, [modalVisible]);

  useEffect(() => {
    if (modalVisible && editingRecord) {
      form.setFieldsValue({
        ...editingRecord,
        hoSoChungTu: editingRecord.hoSoChungTu?.map((h) => h.ma),
      });
    } else if (modalVisible) {
      form.resetFields();
    }
  }, [modalVisible, editingRecord, form]);

  const handleCancel = () => {
    handler.executeEvent('closeModal', {});
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const result = quyChaunSchema.safeParse(values);
      if (!result.success) {
        message.error(result.error.errors[0].message);
        return;
      }

      const isDuplicate = await quyChauanService.duplicateCheck(
        values.loaiGiaoDich,
        values.nghiepVu,
        editingRecord?.id
      );
      if (isDuplicate) {
        message.error('Nghiệp vụ này đã tồn tại cho loại giao dịch đã chọn');
        return;
      }

      const hoSoRefs = (values.hoSoChungTu || []).map((ma: string) => {
        const h = hoSoChungTuList.find((x) => x.ma === ma);
        return { id: h?.id ?? '', ma, ten: h?.ten ?? ma };
      });
      const payload = { ...values, hoSoChungTu: hoSoRefs };

      if (editingRecord) {
        await handler.executeEvent('update', { id: editingRecord.id, data: payload });
      } else {
        await handler.executeEvent('create', payload);
      }
    } catch (error) {
      // Form validation error handled by antd
    }
  };

  // Build options from loaiGiaoDichList
  const loaiGiaoDichOptions = loaiGiaoDichList.map((item: LoaiGiaoDich) => ({
    value: item.ma,
    label: item.ten,
  }));

  return (
    <Modal
      title={editingRecord ? 'Sửa quy chuẩn hạch toán' : 'Thêm quy chuẩn hạch toán'}
      open={modalVisible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText={editingRecord ? 'Cập nhật' : 'Thêm mới'}
      cancelText="Hủy"
      confirmLoading={formLoading}
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="loaiGiaoDich" label={fl('loaiGiaoDich', 'Loại giao dịch')} rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder="Chọn loại giao dịch"
            options={loaiGiaoDichOptions}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
        <Form.Item name="nghiepVu" label={fl('nghiepVu', 'Nghiệp vụ')} rules={[{ required: true, max: 100 }]}>
          <Input placeholder="Ví dụ: Thu tiền bán hàng" />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="taiKhoanNo" label={fl('taiKhoanNo', 'Tài khoản Nợ')} rules={[{ required: true }]}>
              <Select showSearch placeholder="Chọn TK Nợ" options={taiKhoanOptions} filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="taiKhoanCo" label={fl('taiKhoanCo', 'Tài khoản Có')} rules={[{ required: true }]}>
              <Select showSearch placeholder="Chọn TK Có" options={taiKhoanOptions} filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="moTa" label={fl('moTa', 'Mô tả')} rules={[{ max: 255 }]}>
          <Input.TextArea rows={3} placeholder="Mô tả chi tiết về quy chuẩn hạch toán này" />
        </Form.Item>
        <Form.Item name="hoSoChungTu" label="Biên tập hồ sơ">
          <Select
            mode="multiple"
            showSearch
            placeholder="Chọn hồ sơ chứng từ..."
            options={hoSoChungTuList.map((h) => ({ value: h.ma, label: h.ten }))}
            optionFilterProp="label"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
