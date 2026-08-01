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

/**
 * Cấu hình làm thêm / quỹ giờ (P4.2a). Khớp `CauHinhLamThem` ở
 * `be/libs/entities/src/luong/luong.types.ts` và `CauHinhLamThemDto`.
 *
 * P4.2a mới hỗ trợ `chi_nghi_bu`; ba chế độ còn lại bị DTO backend từ chối
 * (chưa nối bảng lương) — FE chỉ cho chọn chế độ được hỗ trợ, không bày ra
 * lựa chọn chắc chắn 400.
 */
export type CheDoBuLamThem =
  | 'chi_nghi_bu'
  | 'chi_tien'
  | 'nhan_vien_chon'
  | 'nghi_bu_va_chenh';

export interface CauHinhLamThem {
  cheDoBu: CheDoBuLamThem;
  heSoTichQuy: { ngay_thuong: number; ngay_nghi: number; ngay_le: number };
  /** null = quỹ không bao giờ hết hạn. */
  soThangHanDung: number | null;
  khiHetHan: 'quy_ra_tien' | 'huy_bo';
}

/** Sàn BLLĐ 2019 Đ98.1 — backend chặn nếu khai thấp hơn ở chế độ chi_nghi_bu. */
export const HE_SO_TICH_SAN = {
  ngay_thuong: 1.5,
  ngay_nghi: 2.0,
  ngay_le: 3.0,
} as const;

export const LAM_THEM_MAC_DINH: CauHinhLamThem = {
  cheDoBu: 'chi_nghi_bu',
  heSoTichQuy: { ...HE_SO_TICH_SAN },
  soThangHanDung: null,
  khiHetHan: 'quy_ra_tien',
};

export interface CauHinhLuong {
  id?: string;
  mucKhaiBaoMacDinh: number;
  congChuan: number;
  khoanLuong: KhoanLuong[];
  giamTruBanThan: number;
  giamTruNPT: number;
  bhxh: { tyLe: number; canCu: 'MUC_KHAI_BAO' | 'LUONG_THOA_THUAN' };
  /** Phần BH công ty chịu — `tyLeHopDongThu2` áp khi NV là HĐLĐ thứ 2. */
  bhCongTy: { tyLe: number; tyLeHopDongThu2: number };
  bacThue: BacThue[];
  thuViec: { tyLe: number };
  quyTacThoiVu: { tyLe: number; nguong: number };
  quyTacCamKet: { mienThue: boolean };
  lamTron: number;
  /**
   * Số giờ của một ngày công — dùng quy đổi ngày↔giờ cho đơn nghỉ bù. Optional
   * ở FE vì bản ghi tạo trước P4.2a không có trường này (backend rơi về 8).
   */
  soGioMoiNgay?: number;
  /**
   * Vắng mặt = công ty CHƯA bật quỹ giờ làm thêm. `QuyGio_Service.layCauHinh()`
   * cố ý trả `null` (không rơi về mặc định ngầm) khi trường này rỗng, nên
   * không đơn OT nào tích quỹ cho tới khi HR khai và lưu ở màn này.
   */
  lamThem?: CauHinhLamThem;
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
