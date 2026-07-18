import { useMemo, useState } from 'react';
import { Form } from 'antd';
import type { ChiTietPhieuKho, LoaiPhieuKho, PhieuKho } from '@/types';
import { docTienBangChu } from '@/pages/chung-tu/phieu/lib/docTienBangChu';

export interface UsePhieuKhoFormReturn {
  /** Antd FormInstance để bind vào <Form form={form}> */
  form: ReturnType<typeof Form.useForm>[0];
  /** Danh sách dòng chi tiết */
  chiTiet: ChiTietPhieuKho[];
  /** Setter cho chiTiet — truyền vào prop onChange của <ChiTietTable> */
  setChiTiet: (rows: ChiTietPhieuKho[]) => void;
  /** Tổng thành tiền = Σ chiTiet[i].thanhTien */
  tongTien: number;
  /** Tổng tiền bằng chữ */
  tongTienBangChu: string;
  /**
   * Gộp form values + chiTiet + tổng tiền + loaiPhieu thành Partial<PhieuKho>
   * sẵn sàng POST lên API.
   */
  buildPayload: () => Partial<PhieuKho>;
}

/**
 * Hook quản lý form phiếu kho.
 *
 * @param loaiPhieu - 'NHAP' | 'XUAT' | 'CHUYEN'
 */
export function usePhieuKhoForm(loaiPhieu: LoaiPhieuKho): UsePhieuKhoFormReturn {
  const [form] = Form.useForm<Partial<PhieuKho>>();
  const [chiTiet, setChiTiet] = useState<ChiTietPhieuKho[]>([]);

  const tongTien = useMemo(
    () => chiTiet.reduce((sum, row) => sum + (row.thanhTien || 0), 0),
    [chiTiet],
  );

  const tongTienBangChu = useMemo(() => docTienBangChu(tongTien), [tongTien]);

  const buildPayload = (): Partial<PhieuKho> => {
    const headerValues = form.getFieldsValue() as Partial<PhieuKho>;
    return {
      ...headerValues,
      loaiPhieu,
      chiTiet,
      tongTien,
      tongTienBangChu,
    };
  };

  return {
    form,
    chiTiet,
    setChiTiet,
    tongTien,
    tongTienBangChu,
    buildPayload,
  };
}
