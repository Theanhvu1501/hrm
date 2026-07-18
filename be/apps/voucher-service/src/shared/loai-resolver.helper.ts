import type { DanhMuc, LoaiChungTu, PhanLoaiChungTu } from '@app/entities';

/** Map phân loại của Loại chứng từ → loai của chứng từ (phân hệ). */
export const PHAN_LOAI_TO_LOAI: Record<PhanLoaiChungTu, LoaiChungTu> = {
  THU: 'PHIEU_THU',
  CHI: 'PHIEU_CHI',
  KHAC: 'KHAC',
};

/**
 * Suy ra `loai` (PHIEU_THU/PHIEU_CHI/KHAC) cho một chứng từ dựa trên cấu hình:
 *   danhMuc.loaiGiaoDich.ma → loaiGiaoDich.loaiChungTuMa → loaiChungTu.phanLoai → loai
 *
 * Thuần, không I/O — nhận sẵn 2 map cấu hình để dễ test và cache.
 * Bất kỳ mắt xích nào thiếu (không chọn loại giao dịch, chưa cấu hình) → trả `fallbackLoai`
 * để giữ tương thích với hành vi cũ (loai theo điểm nhập).
 */
export function resolveLoaiFromConfig(
  danhMuc: DanhMuc | undefined | null,
  fallbackLoai: LoaiChungTu,
  loaiGiaoDichToLoaiChungTu: Map<string, string>,
  loaiChungTuToPhanLoai: Map<string, PhanLoaiChungTu>,
): LoaiChungTu {
  return resolveLoaiInfoFromConfig(
    danhMuc,
    fallbackLoai,
    loaiGiaoDichToLoaiChungTu,
    loaiChungTuToPhanLoai,
  ).loai;
}

export interface LoaiInfo {
  /** Phân hệ (PHIEU_THU/PHIEU_CHI/KHAC) — quyết định fallback PT/PC/NK. */
  loai: LoaiChungTu;
  /** Mã loại chứng từ — tiền tố số phiếu mới. Không có nếu loại giao dịch chưa cấu hình. */
  maLoaiChungTu?: string;
}

/**
 * Như {@link resolveLoaiFromConfig} nhưng trả thêm `maLoaiChungTu` (mã loại chứng từ)
 * để dùng làm tiền tố số phiếu. Nếu loại giao dịch chưa liên kết loại chứng từ → chỉ trả `loai`.
 */
export function resolveLoaiInfoFromConfig(
  danhMuc: DanhMuc | undefined | null,
  fallbackLoai: LoaiChungTu,
  loaiGiaoDichToLoaiChungTu: Map<string, string>,
  loaiChungTuToPhanLoai: Map<string, PhanLoaiChungTu>,
): LoaiInfo {
  const lgdMa = danhMuc?.loaiGiaoDich?.ma;
  if (!lgdMa) return { loai: fallbackLoai };

  const lctMa = loaiGiaoDichToLoaiChungTu.get(lgdMa);
  if (!lctMa) return { loai: fallbackLoai };

  const phanLoai = loaiChungTuToPhanLoai.get(lctMa);
  const loai = phanLoai ? (PHAN_LOAI_TO_LOAI[phanLoai] ?? fallbackLoai) : fallbackLoai;

  return { loai, maLoaiChungTu: lctMa };
}
