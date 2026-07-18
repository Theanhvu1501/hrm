import type { Glossary } from '@/types/tenant';

/** Glossary mặc định hệ thống (fallback cuối). Mở rộng thêm term tại đây. */
export const TERM_REGISTRY: Glossary = {
  chuDauTu: {
    label: 'Chủ đầu tư',
    surfaces: { 'nkc.colMa': 'Mã CĐT', 'nkc.colTen': 'CĐT' },
  },
  duAn: {
    label: 'Dự án',
    surfaces: { 'nkc.colMa': 'Mã dự án', 'nkc.colTen': 'Dự án' },
  },
  doiTuong: {
    label: 'Đối tượng',
    surfaces: {
      'nkc.dtNoMa': 'Mã ĐT nợ', 'nkc.dtNo': 'ĐT nợ',
      'nkc.dtCoMa': 'Mã ĐT có', 'nkc.dtCo': 'ĐT có',
    },
  },
  sanPham: { label: 'Sản phẩm', surfaces: { 'nkc.colMa': 'Mã SP', 'nkc.colTen': 'SP' } },
  boPhan: { label: 'Bộ phận', surfaces: { 'nkc.colMa': 'Mã BP', 'nkc.colTen': 'BP' } },
  doi: { label: 'Đội', surfaces: { 'nkc.colMa': 'Mã Đội', 'nkc.colTen': 'Đội' } },
  nhanVien: { label: 'Nhân viên', surfaces: { 'nkc.colMa': 'Mã NV', 'nkc.colTen': 'NV' } },
  dongTien: { label: 'Dòng tiền', surfaces: { 'nkc.colMa': 'Mã DT', 'nkc.colTen': 'Dòng tiền' } },
  khoanMuc: { label: 'Khoản mục', surfaces: { 'nkc.colMa': 'Mã KM', 'nkc.colTen': 'Khoản mục' } },
  nhomKhuyenMai: { label: 'Nhóm khuyến mãi', surfaces: { 'nkc.colMa': 'Mã NKM', 'nkc.colTen': 'Nhóm KM' } },
  nhomQuanLy: { label: 'Nhóm quản lý', surfaces: { 'nkc.colMa': 'Mã NQL', 'nkc.colTen': 'Nhóm QL' } },
  hopDong: { label: 'Hợp đồng', surfaces: { 'nkc.colMa': 'Số HĐ', 'nkc.colTen': 'Hợp đồng' } },
};

/**
 * Giải nhãn theo chuỗi fallback:
 * tenant.surfaces[surface] → tenant.label
 * → nganh.surfaces[surface] → nganh.label
 * → registry.surfaces[surface] → registry.label → key
 */
export function resolveTerm(
  tenantGlossary: Glossary | undefined,
  nganhGlossary: Glossary | undefined,
  registry: Glossary,
  key: string,
  surface?: string,
): string {
  for (const g of [tenantGlossary, nganhGlossary, registry]) {
    const entry = g?.[key];
    if (!entry) continue;
    if (surface && entry.surfaces?.[surface]) return entry.surfaces[surface];
    if (entry.label) return entry.label;
  }
  return key;
}
