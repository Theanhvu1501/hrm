import { ServiceBase } from './base/service-base';

/** Loại công thức cho một khoản lương — engine diễn giải, KHÔNG công thức tự do. */
export type LoaiCongThuc =
  | 'LUONG_THEO_CONG'
  | 'DINH_MUC_x_CONG'
  | 'CO_DINH_THANG'
  | 'PHAN_TRAM_BASE'
  | 'NHAP_THEO_KY';

export interface ThamSoKhoan {
  dinhMuc?: number;
  soTien?: number;
  tyLe?: number;
  /** với CO_DINH_THANG: lấy số tiền từ trường Hồ sơ NV này (vd 'phuCapCoDinh') thay vì soTien. */
  nguonHoSo?: 'phuCapCoDinh';
}

export interface KhoanLuong {
  ma: string;
  ten: string;
  loaiCongThuc: LoaiCongThuc;
  thamSo: ThamSoKhoan;
  chiuThue: boolean;
  /** phần ≤ trần được miễn thuế, phần vượt mới chịu (null = không có trần). */
  tranMienThue: number | null;
  vaoTongThuNhap: boolean;
  vaoBHXH: boolean;
  thuTu: number;
}

export interface BacThue {
  /** cận trên của bậc; null = ∞ (bậc cuối). */
  den: number | null;
  suat: number; // 0..1
}

export interface CauHinhLuong {
  id?: string;
  mucKhaiBaoMacDinh: number;
  congChuan: number;
  khoanLuong: KhoanLuong[];
  giamTruBanThan: number;
  giamTruNPT: number;
  bhxh: { tyLe: number; canCu: 'MUC_KHAI_BAO' | 'LUONG_THOA_THUAN' };
  bacThue: BacThue[];
  thuViec: { tyLe: number };
  quyTacThoiVu: { tyLe: number; nguong: number };
  quyTacCamKet: { mienThue: boolean };
  lamTron: number;
}

/**
 * BE `bang-luong.controller.ts` gộp cấu hình lương vào chung controller
 * `@Controller('bang-luong')` (route `GET/PUT cau-hinh`), KHÔNG có controller
 * `/config/cau-hinh-luong` riêng — nên endpoint gốc ở đây PHẢI là
 * `/config/bang-luong`, và các method gọi thêm path `/cau-hinh`.
 */
class CauHinhLuongService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/bang-luong' });
  }

  async get(): Promise<CauHinhLuong> {
    return super.get<CauHinhLuong>({ endpoint: '/cau-hinh' });
  }

  /**
   * `forbidNonWhitelisted` ở `CapNhatCauHinhLuongDto` (BE) chặn thẳng 400 nếu
   * body có field ngoài whitelist — mà `dto` truyền vào đây thường là cả
   * object `CauHinhLuong` đọc từ state (kèm `id`/`_id`/`tenantId`/`createdAt`/
   * `updatedAt`/`isActive` do server quản lý), nên phải lọc bỏ trước khi PUT.
   */
  async update(dto: Partial<CauHinhLuong>): Promise<CauHinhLuong> {
    const { id, _id, tenantId, createdAt, updatedAt, isActive, ...payload } =
      dto as Record<string, unknown>;
    const res = await super.put<Record<string, unknown>>(payload, { endpoint: '/cau-hinh' });
    return res as unknown as CauHinhLuong;
  }
}

export const cauHinhLuongService = new CauHinhLuongService();
