import { z } from 'zod';
import type { LoaiPhieuKho } from '@/types';

// Chuỗi/số tùy chọn: chấp nhận cả null (server trả null cho cột nullable trống)
// lẫn undefined. .optional() KHÔNG nhận null nên phải dùng .nullish().
const optStr = z.string().nullish();
const optNum = z.number().nullish();

/** Schema cho một dòng chi tiết phiếu kho */
const chiTietSchema = z.object({
  stt: z.number(),
  hangHoaMa: optStr,
  hangHoaTen: optStr,
  quyCach: optStr,
  donViTinh: optStr,
  khoMa: optStr,
  khoTen: optStr,
  tkNo: optStr,
  tkCo: optStr,
  soLuong: z.number().min(0).default(0),
  soLuongChungTu: optNum,
  soLuongThucTe: optNum,
  donGia: z.number().min(0).default(0),
  thanhTien: z.number().min(0).default(0),
});

/** Schema header chung cho phiếu kho */
const baseHeaderSchema = z.object({
  loaiNghiepVu: optStr,
  soPhieu: optStr,
  ngayHachToan: z.string().min(1, 'Vui lòng chọn ngày hạch toán'),
  ngayChungTu: optStr,
  soChungTuGoc: optStr,
  thamChieu: optStr,
  doiTuongMa: optStr,
  doiTuongTen: optStr,
  diaChi: optStr,
  nguoiGiaoNhan: optStr,
  nhanVien: optStr,
  dienGiai: optStr,
  khoMa: optStr,
  khoTen: optStr,
  khoXuatMa: optStr,
  khoXuatTen: optStr,
  khoNhapMa: optStr,
  khoNhapTen: optStr,
  nguoiVanChuyen: optStr,
  hopDongVC: optStr,
  phuongTienVC: optStr,
  lenhDieuDong: optStr,
  veViec: optStr,
  chiTiet: z.array(chiTietSchema).default([]),
});

/** Factory: tạo schema có validation tùy loaiPhieu */
export function makePhieuKhoSchema(loaiPhieu: LoaiPhieuKho) {
  return baseHeaderSchema.superRefine((data, ctx) => {
    // Bắt buộc ít nhất 1 dòng chi tiết có hangHoaMa
    const hasHangHoa = data.chiTiet.some((r) => r.hangHoaMa && r.hangHoaMa.trim() !== '');
    if (!hasHangHoa) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['chiTiet'],
        message: 'Phiếu phải có ít nhất một dòng hàng hóa',
      });
    }

    if (loaiPhieu === 'CHUYEN') {
      // Phiếu chuyển kho: khoXuatMa + khoNhapMa bắt buộc ở header
      if (!data.khoXuatMa || data.khoXuatMa.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['khoXuatMa'],
          message: 'Vui lòng chọn kho xuất',
        });
      }
      if (!data.khoNhapMa || data.khoNhapMa.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['khoNhapMa'],
          message: 'Vui lòng chọn kho nhập',
        });
      }
    } else {
      // Phiếu nhập / xuất: ít nhất 1 dòng có khoMa, hoặc header có khoMa
      const headerHasKho = data.khoMa && data.khoMa.trim() !== '';
      const detailHasKho = data.chiTiet.some((r) => r.khoMa && r.khoMa.trim() !== '');
      if (!headerHasKho && !detailHasKho) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['chiTiet'],
          message: 'Vui lòng chọn kho cho ít nhất một dòng (hoặc chọn kho mặc định ở header)',
        });
      }
    }
  });
}

/** Schema mặc định (không ràng buộc loaiPhieu cụ thể — dùng cho khởi tạo form) */
export const phieuKhoSchema = baseHeaderSchema;

export type PhieuKhoFormValues = z.infer<typeof baseHeaderSchema>;
export type ChiTietFormValues = z.infer<typeof chiTietSchema>;
