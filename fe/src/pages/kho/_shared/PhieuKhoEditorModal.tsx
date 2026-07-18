import { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Row,
  Col,
  Divider,
  Typography,
  Spin,
  message,
} from 'antd';
import dayjs from 'dayjs';
import type { PhieuKho, LoaiPhieuKho, Kho, DoiTuong } from '@/types';
import { phieuKhoService } from '@/services/phieuKhoService';
import { khoService } from '@/services/khoService';
import { doiTuongService } from '@/services/doiTuongService';
import { makePhieuKhoSchema } from './phieuKhoSchema';
import { usePhieuKhoForm } from './usePhieuKhoForm';
import { ChiTietTable } from './ChiTietTable';
import { formatCurrency } from '@/pages/chung-tu/phieu/lib/format';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';

const { Text } = Typography;

interface Props {
  open: boolean;
  loaiPhieu: LoaiPhieuKho;
  editingId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export function PhieuKhoEditorModal({ open, loaiPhieu, editingId, onClose, onSaved }: Props) {
  const { form, chiTiet, setChiTiet, tongTien, tongTienBangChu, buildPayload } =
    usePhieuKhoForm(loaiPhieu);

  const fl = useFieldLabels('kho.phieu');

  const [khoList, setKhoList] = useState<Kho[]>([]);
  const [doiTuongList, setDoiTuongList] = useState<DoiTuong[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nextSo, setNextSo] = useState<string>('');

  // Load reference data once
  useEffect(() => {
    khoService.getAll().then(setKhoList).catch(() => {});
    doiTuongService.getAll().then(setDoiTuongList).catch(() => {});
  }, []);

  // On open: load record or fetch next so
  useEffect(() => {
    if (!open) return;

    form.resetFields();
    setChiTiet([]);
    setNextSo('');

    if (editingId) {
      setLoadingData(true);
      phieuKhoService
        .getById(editingId)
        .then((phieu) => {
          form.setFieldsValue({
            soPhieu: phieu.soPhieu,
            loaiNghiepVu: phieu.loaiNghiepVu,
            ngayHachToan: phieu.ngayHachToan ? dayjs(phieu.ngayHachToan) : undefined,
            ngayChungTu: phieu.ngayChungTu ? dayjs(phieu.ngayChungTu) : undefined,
            soChungTuGoc: phieu.soChungTuGoc,
            doiTuongMa: phieu.doiTuongMa,
            doiTuongTen: phieu.doiTuongTen,
            nguoiGiaoNhan: phieu.nguoiGiaoNhan,
            diaChi: phieu.diaChi,
            dienGiai: phieu.dienGiai,
            khoMa: phieu.khoMa,
            khoXuatMa: phieu.khoXuatMa,
            khoNhapMa: phieu.khoNhapMa,
            nguoiVanChuyen: phieu.nguoiVanChuyen,
            phuongTienVC: phieu.phuongTienVC,
            lenhDieuDong: phieu.lenhDieuDong,
            veViec: phieu.veViec,
          });
          setChiTiet(phieu.chiTiet || []);
        })
        .catch(() => message.error('Không tải được phiếu'))
        .finally(() => setLoadingData(false));
    } else {
      phieuKhoService
        .getNextSo(loaiPhieu)
        .then(setNextSo)
        .catch(() => {});
      // Set default ngayHachToan = today
      form.setFieldsValue({ ngayHachToan: dayjs() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId, loaiPhieu]);

  const khoOptions = khoList.map((k) => ({ value: k.ma, label: `${k.ma} - ${k.ten}` }));
  const doiTuongOptions = doiTuongList.map((d) => ({ value: d.ma, label: `${d.ma} - ${d.ten}` }));

  const handleDoiTuongChange = (ma: string) => {
    const dt = doiTuongList.find((d) => d.ma === ma);
    form.setFieldsValue({ doiTuongTen: dt?.ten || '', diaChi: dt?.diaChi || '' });
  };

  const handleKhoXuatChange = (ma: string) => {
    const kho = khoList.find((k) => k.ma === ma);
    form.setFieldsValue({ khoXuatTen: kho?.ten || '' });
  };

  const handleKhoNhapChange = (ma: string) => {
    const kho = khoList.find((k) => k.ma === ma);
    form.setFieldsValue({ khoNhapTen: kho?.ten || '' });
  };

  const handleKhoChange = (ma: string) => {
    const kho = khoList.find((k) => k.ma === ma);
    form.setFieldsValue({ khoTen: kho?.ten || '' });
  };

  const handleSave = async () => {
    // Build payload first, then convert dayjs dates to strings for validation + sending
    const rawPayload = buildPayload();
    const formValues = form.getFieldsValue();
    const finalPayload: Partial<PhieuKho> = {
      ...rawPayload,
      ngayHachToan: formValues.ngayHachToan
        ? dayjs(formValues.ngayHachToan).format('YYYY-MM-DD')
        : '',
      ngayChungTu: formValues.ngayChungTu
        ? dayjs(formValues.ngayChungTu).format('YYYY-MM-DD')
        : undefined,
      chiTiet: chiTiet.map((row) => ({
        ...row,
        soLuong: row.soLuong ?? 0,
        donGia: row.donGia ?? 0,
        thanhTien: row.thanhTien ?? 0,
      })),
    };

    const schema = makePhieuKhoSchema(loaiPhieu);
    const result = schema.safeParse(finalPayload);
    if (!result.success) {
      const firstError = result.error.issues[0];
      message.error(firstError.message || 'Dữ liệu không hợp lệ');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await phieuKhoService.update(editingId, finalPayload);
        message.success('Đã cập nhật phiếu');
      } else {
        await phieuKhoService.create(finalPayload as Omit<PhieuKho, 'id'>);
        message.success('Đã tạo phiếu');
      }
      onSaved();
      onClose();
    } catch {
      message.error('Lưu thất bại, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  const modalTitle =
    loaiPhieu === 'NHAP'
      ? editingId
        ? 'Sửa phiếu nhập kho'
        : 'Lập phiếu nhập kho'
      : loaiPhieu === 'XUAT'
        ? editingId
          ? 'Sửa phiếu xuất kho'
          : 'Lập phiếu xuất kho'
        : editingId
          ? 'Sửa phiếu chuyển kho'
          : 'Lập phiếu chuyển kho';

  return (
    <Modal
      open={open}
      title={modalTitle}
      width={1100}
      onCancel={onClose}
      onOk={handleSave}
      okText={saving ? 'Đang lưu...' : 'Lưu'}
      cancelText="Đóng"
      confirmLoading={saving}
      destroyOnClose
      styles={{ body: { maxHeight: '80vh', overflowY: 'auto', padding: '16px' } }}
    >
      <Spin spinning={loadingData}>
        <Form form={form} layout="vertical" size="small">
          {/* ---- Số phiếu + ngày ---- */}
          <Row gutter={12}>
            <Col span={6}>
              <Form.Item label={fl('soPhieu', 'Số phiếu')} name="soPhieu">
                <Input
                  placeholder={!editingId && nextSo ? `Dự kiến: ${nextSo}` : 'Tự động'}
                  disabled={!!editingId}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label={fl('ngayHachToan', 'Ngày hạch toán')}
                name="ngayHachToan"
                rules={[{ required: true, message: 'Vui lòng chọn ngày hạch toán' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label={fl('ngayChungTu', 'Ngày chứng từ')} name="ngayChungTu">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label={fl('soChungTuGoc', 'Số CT gốc')} name="soChungTuGoc">
                <Input placeholder="Số chứng từ gốc" />
              </Form.Item>
            </Col>
          </Row>

          {/* ---- Header tùy loại phiếu ---- */}
          {loaiPhieu === 'NHAP' && (
            <>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item label={fl('doiTuongMa', 'Đối tượng')} name="doiTuongMa">
                    <Select
                      showSearch
                      allowClear
                      optionFilterProp="label"
                      placeholder="-- Chọn đối tượng --"
                      options={doiTuongOptions}
                      onChange={handleDoiTuongChange}
                      onClear={() => form.setFieldsValue({ doiTuongTen: '', diaChi: '' })}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label={fl('doiTuongTen', 'Tên đối tượng')} name="doiTuongTen">
                    <Input placeholder="Tên đối tượng" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label={fl('nguoiGiaoNhan', 'Người giao')} name="nguoiGiaoNhan">
                    <Input placeholder="Người giao hàng" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item label={fl('khoMa', 'Kho nhập')} name="khoMa">
                    <Select
                      showSearch
                      allowClear
                      optionFilterProp="label"
                      placeholder="-- Chọn kho --"
                      options={khoOptions}
                      onChange={handleKhoChange}
                      onClear={() => form.setFieldsValue({ khoTen: '' })}
                    />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item label={fl('dienGiai', 'Diễn giải')} name="dienGiai">
                    <Input placeholder="Diễn giải nội dung" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {loaiPhieu === 'XUAT' && (
            <>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item label={fl('doiTuongMa', 'Khách / Người nhận')} name="doiTuongMa">
                    <Select
                      showSearch
                      allowClear
                      optionFilterProp="label"
                      placeholder="-- Chọn đối tượng --"
                      options={doiTuongOptions}
                      onChange={handleDoiTuongChange}
                      onClear={() => form.setFieldsValue({ doiTuongTen: '', diaChi: '' })}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label={fl('doiTuongTen', 'Tên người nhận')} name="doiTuongTen">
                    <Input placeholder="Tên người nhận" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label={fl('khoMa', 'Kho xuất')} name="khoMa">
                    <Select
                      showSearch
                      allowClear
                      optionFilterProp="label"
                      placeholder="-- Chọn kho --"
                      options={khoOptions}
                      onChange={handleKhoChange}
                      onClear={() => form.setFieldsValue({ khoTen: '' })}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={24}>
                  <Form.Item label={fl('dienGiai', 'Lý do xuất / Diễn giải')} name="dienGiai">
                    <Input placeholder="Lý do xuất kho" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {loaiPhieu === 'CHUYEN' && (
            <>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item label={fl('khoXuatMa', 'Kho xuất')} name="khoXuatMa">
                    <Select
                      showSearch
                      allowClear
                      optionFilterProp="label"
                      placeholder="-- Chọn kho xuất --"
                      options={khoOptions}
                      onChange={handleKhoXuatChange}
                      onClear={() => form.setFieldsValue({ khoXuatTen: '' })}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label={fl('khoNhapMa', 'Kho nhập')} name="khoNhapMa">
                    <Select
                      showSearch
                      allowClear
                      optionFilterProp="label"
                      placeholder="-- Chọn kho nhập --"
                      options={khoOptions}
                      onChange={handleKhoNhapChange}
                      onClear={() => form.setFieldsValue({ khoNhapTen: '' })}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label={fl('nguoiVanChuyen', 'Người vận chuyển')} name="nguoiVanChuyen">
                    <Input placeholder="Người vận chuyển" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item label={fl('phuongTienVC', 'Phương tiện vận chuyển')} name="phuongTienVC">
                    <Input placeholder="Phương tiện" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label={fl('lenhDieuDong', 'Lệnh điều động')} name="lenhDieuDong">
                    <Input placeholder="Số lệnh điều động" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label={fl('veViec', 'Về việc')} name="veViec">
                    <Input placeholder="Về việc" />
                  </Form.Item>
                </Col>
              </Row>
              {/* Hidden fields for ten */}
              <Form.Item name="khoXuatTen" hidden><Input /></Form.Item>
              <Form.Item name="khoNhapTen" hidden><Input /></Form.Item>
            </>
          )}

          {/* Hidden khoTen for NHAP/XUAT (khoXuatTen/khoNhapTen already handled inside CHUYEN block) */}
          {loaiPhieu !== 'CHUYEN' && (
            <Form.Item name="khoTen" hidden><Input /></Form.Item>
          )}

          <Divider orientation="left" plain style={{ fontSize: 13, margin: '8px 0' }}>
            Chi tiết hàng hóa
          </Divider>

          <ChiTietTable value={chiTiet} onChange={setChiTiet} loaiPhieu={loaiPhieu} />

          {chiTiet.length > 0 && (
            <div style={{ marginTop: 8, textAlign: 'right' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Tổng tiền bằng chữ:{' '}
              </Text>
              <Text strong style={{ fontSize: 13 }}>
                {tongTienBangChu}
              </Text>
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Tổng cộng:{' '}
                </Text>
                <Text strong style={{ fontSize: 14, color: '#1f7769' }}>
                  {formatCurrency(tongTien)}
                </Text>
              </div>
            </div>
          )}
        </Form>
      </Spin>
    </Modal>
  );
}
