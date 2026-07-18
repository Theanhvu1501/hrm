// Pure functions tính thuế — không phụ thuộc framework, dễ test (TDD).

/**
 * Thuế suất TNDN bậc thang theo doanh thu lũy kế năm.
 * <1 tỷ → 0 · 1–3 tỷ → 15% · 3–50 tỷ → 17% · ≥50 tỷ → 20%.
 */
export function tinhThueSuatTNDN(doanhThuLuyKe: number): number {
  if (doanhThuLuyKe < 1_000_000_000) return 0;
  if (doanhThuLuyKe < 3_000_000_000) return 0.15;
  if (doanhThuLuyKe < 50_000_000_000) return 0.17;
  return 0.2;
}

/** Tổng tiền thuế GTGT của một kỳ từ danh sách dòng bảng kê. */
export function tongVatTheoKy(items: { tienThue: number }[]): number {
  return items.reduce((s, i) => s + (Number(i.tienThue) || 0), 0);
}

export interface TNDNQuyInput {
  dt511: number;
  dt515: number;
  dt711: number;
  cp632: number;
  cp641: number;
  cp642: number;
  cp811: number;
  chiPhiKhongTru: number;
  thuNhapMien: number;
  loChuyen: number;
  thueSuat: number;
}

export interface TNDNQuyResult {
  tongChiPhi: number;
  lnTruocThue: number;
  thuNhapTinhThue: number;
  thueTNDN: number;
  lnSauThue: number;
}

/** Tính các chỉ tiêu TNDN cho một quý. */
export function tinhTNDNQuy(i: TNDNQuyInput): TNDNQuyResult {
  const tongChiPhi = i.cp632 + i.cp641 + i.cp642 + i.cp811;
  const lnTruocThue = i.dt511 + i.dt515 + i.dt711 - tongChiPhi;
  const thuNhapTinhThue =
    lnTruocThue + i.chiPhiKhongTru - i.thuNhapMien - i.loChuyen;
  const thueTNDN = Math.max(0, thuNhapTinhThue) * i.thueSuat;
  const lnSauThue = lnTruocThue - thueTNDN;
  return { tongChiPhi, lnTruocThue, thuNhapTinhThue, thueTNDN, lnSauThue };
}
