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
  /** Hệ số TRẢ TIỀN từng loại ngày (P4.2c dùng để tính tiền làm thêm). */
  heSoTra: Record<string, number>;
  /** Hệ số quy đổi vào quỹ nghỉ bù. */
  heSoTichQuy: Record<string, number>;
  /** null = công ty không có ca đêm. */
  khungGioDem: { tu: string; den: string } | null;
  /** Giờ thuộc nhiều loại thì loại đứng TRƯỚC trong mảng này thắng. */
  uuTienLoai: string[];
  /** Loại nào được tách phần chênh miễn thuế TNCN. */
  mienThueChenh: string[];
  /** null = quỹ không bao giờ hết hạn. */
  soThangHanDung: number | null;
  khiHetHan: 'quy_ra_tien' | 'huy_bo';
}

/**
 * Sàn BLLĐ 2019 Đ98.1 — backend chặn nếu hệ số TÍCH QUỸ khai thấp hơn ở chế
 * độ `chi_nghi_bu`. `ngay_dem` cố ý KHÔNG có sàn: BLLĐ Đ98.1 không nói về ca
 * đêm, và mức 1,5 chủ sản phẩm chốt là lựa chọn của công ty (spec P4.2b §8.1).
 */
export const HE_SO_TICH_SAN: Record<string, number> = {
  ngay_thuong: 1.5,
  ngay_nghi: 2.0,
  ngay_le: 3.0,
};

/**
 * Nhãn tiếng Việt của các loại ngày mặc định. Loại do công ty tự thêm không
 * có ở đây thì màn hình hiện chính khoá của nó — thà xấu còn hơn ẩn mất một
 * dòng hệ số đang có hiệu lực.
 */
export const NHAN_LOAI_NGAY: Record<string, string> = {
  ngay_thuong: 'Ngày thường',
  ngay_nghi: 'Ngày nghỉ hằng tuần',
  ngay_le: 'Ngày lễ / Tết',
  ngay_dem: 'Buổi đêm',
};

export const LAM_THEM_MAC_DINH: CauHinhLamThem = {
  cheDoBu: 'chi_nghi_bu',
  heSoTra: { ngay_thuong: 1.5, ngay_nghi: 2.0, ngay_le: 3.0, ngay_dem: 1.5 },
  heSoTichQuy: { ngay_thuong: 1.5, ngay_nghi: 2.0, ngay_le: 3.0, ngay_dem: 1.5 },
  khungGioDem: { tu: '22:00', den: '06:00' },
  uuTienLoai: ['ngay_le', 'ngay_nghi', 'ngay_dem', 'ngay_thuong'],
  mienThueChenh: ['ngay_dem'],
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
  /** Phí công đoàn trừ vào lương NLĐ. Cấu hình cũ chưa có → đọc `?? 0`. */
  phiCongDoan?: { tyLe: number };
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
 * Bồi các trường P4.2b còn thiếu vào `lamThem` đọc từ server.
 *
 * Công ty đã bật quỹ giờ từ P4.2a có `lamThem` KHÔNG có `heSoTra`,
 * `khungGioDem`, `uuTienLoai`, `mienThueChenh` — server không tự vá bản ghi
 * đã lưu (`bang-luong.service.layCauHinh()` chỉ seed khi CHƯA có hàng nào).
 * Thiếu chúng thì `LamThemEditor` gọi `lamThem.uuTienLoai.map(...)` trên
 * `undefined` và ném ngay lúc render — repo không có ErrorBoundary nên đó là
 * **trắng TOÀN trang Cấu hình lương**, không phải một khối hỏng.
 *
 * Bồi ở tầng service chứ không ở component: giá trị bồi vào cũng chính là
 * giá trị được PUT lên khi HR bấm Lưu, nên DTO backend (bốn trường này là
 * BẮT BUỘC) nhận đủ. Vá ở component thì form hiện đủ nhưng payload gửi lên
 * vẫn thiếu và trả 400 cho cả form.
 *
 * `undefined` giữ nguyên `undefined` — đó là "công ty CHƯA bật quỹ giờ", một
 * trạng thái thật mà màn hình có nhánh riêng để xử lý.
 */
export function chuanHoaLamThem(
  lamThem: CauHinhLamThem | undefined,
): CauHinhLamThem | undefined {
  if (!lamThem) return undefined;
  return {
    ...lamThem,
    heSoTra: lamThem.heSoTra ?? { ...LAM_THEM_MAC_DINH.heSoTra },
    heSoTichQuy: lamThem.heSoTichQuy ?? { ...LAM_THEM_MAC_DINH.heSoTichQuy },
    // `null` là lựa chọn hợp lệ ("không có ca đêm") nên chỉ bồi khi vắng hẳn.
    khungGioDem:
      lamThem.khungGioDem === undefined
        ? { ...LAM_THEM_MAC_DINH.khungGioDem! }
        : lamThem.khungGioDem,
    uuTienLoai: lamThem.uuTienLoai ?? [...LAM_THEM_MAC_DINH.uuTienLoai],
    mienThueChenh: lamThem.mienThueChenh ?? [...LAM_THEM_MAC_DINH.mienThueChenh],
  };
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
    const ch = await super.get<CauHinhLuong>({ endpoint: '/cau-hinh' });
    return { ...ch, lamThem: chuanHoaLamThem(ch.lamThem) };
  }

  /**
   * Số ĐƠN làm thêm đang tham chiếu từng loại ngày, để chặn xoá loại đang
   * dùng. Khoá vắng mặt = 0 đơn.
   */
  async demDonTheoLoaiOt(): Promise<Record<string, number>> {
    return super.get<Record<string, number>>({
      endpoint: '/dem-don-theo-loai-ot',
    });
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
