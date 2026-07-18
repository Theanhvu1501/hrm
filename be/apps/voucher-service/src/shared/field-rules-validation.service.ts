import { Injectable, BadRequestException } from '@nestjs/common';
import { ServiceClient } from '@app/service-client';
import type { DanhMuc } from '@app/entities';

interface ItemWithDanhMuc {
  danhMuc?: DanhMuc;
}

interface TaiKhoanWithRules {
  ma: string;
  fieldRules?: Record<string, 'BAT_BUOC' | 'CANH_BAO'> | null;
}

const FIELD_LABELS: Record<string, string> = {
  doiTuong: 'Đối tượng',
  duAn: 'Dự án',
  boPhan: 'Bộ phận',
  doi: 'Đội thi công',
  nhanVien: 'Nhân viên',
  sanPham: 'Sản phẩm',
  dongTien: 'Dòng tiền',
  khoanMuc: 'Khoản mục',
  soTaiKhoanNganHang: 'Số tài khoản ngân hàng',
};

/**
 * Enforce mức BAT_BUOC của TaiKhoan.fieldRules khi tạo/sửa chứng từ.
 * CANH_BAO chỉ xử lý ở FE (user đã xác nhận trước khi gửi).
 * Master-data không phản hồi → bỏ qua (không chặn nghiệp vụ), cùng quy ước
 * với AccountValidationService.
 */
@Injectable()
export class FieldRulesValidationService {
  constructor(private readonly serviceClient: ServiceClient) {}

  async validateItems(items: ItemWithDanhMuc[], authToken?: string): Promise<void> {
    const hasDanhMuc = items.some((i) => i.danhMuc);
    if (!hasDanhMuc) return;

    // /tai-khoan/leaf trả mảng phẳng các TK hạch toán được (không phân trang)
    const response = await this.serviceClient.get<TaiKhoanWithRules[]>(
      'master-data',
      '/tai-khoan/leaf',
      { headers: authToken ? { Authorization: authToken } : undefined },
    );
    if (!response.success || !Array.isArray(response.data)) return;

    const rulesByMa = new Map(
      response.data.filter((tk) => tk.fieldRules).map((tk) => [tk.ma, tk.fieldRules!]),
    );
    if (rulesByMa.size === 0) return;

    const errors: string[] = [];
    items.forEach((item, idx) => {
      const dm = item.danhMuc;
      if (!dm) return;
      const checkSide = (
        tkMa: string | undefined,
        doiTuong: { ma?: string; soTaiKhoan?: string } | undefined,
      ) => {
        if (!tkMa) return;
        const rules = rulesByMa.get(tkMa);
        if (!rules) return;
        for (const [field, level] of Object.entries(rules)) {
          if (level !== 'BAT_BUOC') continue;
          let filled: boolean;
          if (field === 'doiTuong') {
            filled = Boolean(doiTuong?.ma);
          } else if (field === 'soTaiKhoanNganHang') {
            filled = Boolean(doiTuong?.soTaiKhoan && String(doiTuong.soTaiKhoan).trim());
          } else {
            filled = Boolean(
              (dm as Record<string, { ma?: string } | undefined>)[field]?.ma,
            );
          }
          if (!filled) {
            errors.push(
              `Dòng ${idx + 1}: TK ${tkMa} bắt buộc nhập ${FIELD_LABELS[field] ?? field}`,
            );
          }
        }
      };
      checkSide(dm.taiKhoanNo?.ma, dm.doiTuong);
      checkSide(dm.taiKhoanCo?.ma, dm.doiTuong2);
    });

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }
  }
}
