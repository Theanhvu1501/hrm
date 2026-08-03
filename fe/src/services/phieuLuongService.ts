import { ServiceBase } from './base/service-base';

export interface KhoanPhieuLuong {
  ma: string;
  ten: string;
  soTien: number;
}

/**
 * Mirror `PhieuLuong` (be/libs/entities/src/luong/luong.types.ts).
 *
 * CỐ Ý không có mức khai báo — backend không gửi, và cũng không được thêm vào
 * đây: hiện mức khai báo là phơi bày chiến lược khai báo BHXH của công ty cho
 * toàn bộ nhân viên.
 */
export interface PhieuLuong {
  thang: string;
  hoTen: string;
  maNhanVien: string;
  congThuong: number;
  congThuViec: number;
  congKhac: number;
  khoan: KhoanPhieuLuong[];
  tongThuNhap: number;
  bhxh: number;
  thue: number;
  phiCongDoan: number;
  tamUng: number;
  khauTruKhac: number;
  thucLinh: number;
  thuNhapMienThue: number;
  giamTru: number;
  thuNhapTinhThue: number;
}

class PhieuLuongService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/bang-luong' });
  }

  /** Các kỳ CÓ phiếu (đã chốt), mới nhất trước. */
  async cacKy(): Promise<string[]> {
    return super.get<string[]>({ endpoint: '/cua-toi/ky' });
  }

  /** `null` = kỳ chưa chốt hoặc chưa có dòng lương. */
  async phieu(thang: string): Promise<PhieuLuong | null> {
    return super.get<PhieuLuong | null>({
      endpoint: '/cua-toi',
      params: { thang },
    });
  }
}

export const phieuLuongService = new PhieuLuongService();
