import { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Input, Upload, Typography, Space, Collapse } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { PhieuKho, LoaiPhieuKho } from '@/types';
import { khoTemplateService } from '@/services/khoTemplateService';
import {
  getDefaultKhoTemplate,
  KHO_PLACEHOLDERS,
  KHO_TEMPLATE_KEY,
} from './khoPrintTemplates';
import { buildKhoPhieuHtml } from './printKhoPhieu';

const { Text } = Typography;

const TITLE: Record<LoaiPhieuKho, string> = {
  NHAP: 'Phiếu nhập kho',
  XUAT: 'Phiếu xuất kho',
  CHUYEN: 'Phiếu chuyển kho',
};

/** Phiếu mẫu để xem trước mẫu in. */
function buildSample(loaiPhieu: LoaiPhieuKho): PhieuKho {
  return {
    id: 'preview',
    loaiPhieu,
    soPhieu: loaiPhieu === 'NHAP' ? 'NK00001' : loaiPhieu === 'XUAT' ? 'XK00001' : 'CK00001',
    ngayHachToan: '2026-06-21T00:00:00.000Z',
    ngayChungTu: '2026-06-21T00:00:00.000Z',
    soChungTuGoc: '02',
    doiTuongTen: 'Công ty TNHH Vật Liệu ABC',
    nguoiGiaoNhan: 'Nguyễn Văn A',
    dienGiai: loaiPhieu === 'XUAT' ? 'Xuất kho bán hàng' : 'Nhập kho vật tư',
    khoTen: 'Kho NVL Thanh Long',
    khoXuatTen: 'Kho NVL Thanh Long',
    khoNhapTen: 'Kho TP Thanh Long',
    lenhDieuDong: 'LĐĐ-01',
    veViec: 'Điều chuyển vật tư nội bộ',
    nguoiVanChuyen: 'Trần Văn B',
    hopDongVC: 'HĐ-2026/05',
    phuongTienVC: 'Xe tải 1.5 tấn',
    tongTien: 3800000,
    chiTiet: [
      { stt: 1, hangHoaMa: 'VT000009', hangHoaTen: 'Giấy in A4 Double A', donViTinh: 'Tập', tkNo: '152', tkCo: '111', soLuong: 10, soLuongChungTu: 10, soLuongThucTe: 10, donGia: 80000, thanhTien: 800000 },
      { stt: 2, hangHoaMa: 'VT000010', hangHoaTen: 'Mực in', quyCach: 'HP 12A', donViTinh: 'Hộp', tkNo: '152', tkCo: '111', soLuong: 2, soLuongChungTu: 2, soLuongThucTe: 2, donGia: 1500000, thanhTien: 3000000 },
    ],
  } as PhieuKho;
}

interface Props {
  loaiPhieu: LoaiPhieuKho;
  open: boolean;
  onClose: () => void;
  /** gọi sau khi lưu/khôi phục — truyền mẫu mới (null = về mặc định). */
  onSaved?: (html: string | null) => void;
}

export function KhoTemplateModal({ loaiPhieu, open, onClose, onSaved }: Props) {
  const { currentTenant } = useAuth();
  const key = KHO_TEMPLATE_KEY[loaiPhieu];

  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    khoTemplateService
      .getByLoai(key)
      .then((tpl) => {
        if (!cancelled) setHtml(tpl?.html || getDefaultKhoTemplate(loaiPhieu));
      })
      .catch(() => {
        if (!cancelled) setHtml(getDefaultKhoTemplate(loaiPhieu));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, key, loaiPhieu]);

  const previewHtml = useMemo(
    () =>
      buildKhoPhieuHtml(buildSample(loaiPhieu), html, {
        tenCongTy: currentTenant?.tenantName ?? '',
        diaChiCongTy: '',
      }),
    [html, loaiPhieu, currentTenant],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await khoTemplateService.upsert(key, html);
      toast.success('Đã lưu mẫu in');
      onSaved?.(html);
      onClose();
    } catch {
      toast.error('Lưu mẫu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await khoTemplateService.remove(key);
      setHtml(getDefaultKhoTemplate(loaiPhieu));
      toast.success('Đã khôi phục mẫu mặc định');
      onSaved?.(null);
    } catch {
      toast.error('Khôi phục thất bại');
    } finally {
      setSaving(false);
    }
  };

  const uploadProps: UploadProps = {
    accept: '.html,.htm,text/html',
    showUploadList: false,
    beforeUpload: (file) => {
      const reader = new FileReader();
      reader.onload = () => setHtml(String(reader.result ?? ''));
      reader.readAsText(file);
      return false;
    },
  };

  return (
    <Modal
      title={`Mẫu in — ${TITLE[loaiPhieu]}`}
      open={open}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="reset" danger onClick={handleReset} loading={saving}>
          Khôi phục mặc định
        </Button>,
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
        <Button key="save" type="primary" onClick={handleSave} loading={saving}>
          Lưu mẫu
        </Button>,
      ]}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Text strong>Mã HTML</Text>
            <Upload {...uploadProps}>
              <Button size="small" icon={<UploadOutlined />}>
                Tải file .html
              </Button>
            </Upload>
          </div>
          <Input.TextArea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            autoSize={{ minRows: 14, maxRows: 14 }}
            spellCheck={false}
            disabled={loading}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
          <Collapse
            ghost
            size="small"
            items={[
              {
                key: 'ph',
                label: 'Placeholder hỗ trợ',
                children: (
                  <Space direction="vertical" size={2}>
                    {KHO_PLACEHOLDERS.map((p) => (
                      <Text key={p.token} className="text-xs">
                        <code>{p.token}</code> — {p.moTa}
                      </Text>
                    ))}
                  </Space>
                ),
              },
            ]}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Text strong>Xem trước</Text>
          <iframe
            title="preview"
            className="w-full rounded-md border bg-white"
            style={{ height: 420 }}
            srcDoc={previewHtml}
          />
        </div>
      </div>
    </Modal>
  );
}
