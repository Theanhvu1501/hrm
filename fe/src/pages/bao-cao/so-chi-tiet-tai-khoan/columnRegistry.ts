import React from 'react';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { SoChiTietReport } from '@/services/soChiTietTaiKhoanService';

const STORAGE_KEY = 'sct-visible-columns';
// Khoá lưu công ty hiện tại (service-base/setCurrentTenant). Mỗi công ty một bộ cột.
const TENANT_STORAGE_KEY = 'current_tenant';
const NO_TENANT_SCOPE = '_';

export type Kind = 'opening' | 'entry' | 'cong' | 'cuoi';

export interface DisplayRow {
  key: string;
  kind: Kind;
  ngay?: string;
  soPhieu?: string;
  ngayChungTu?: string;
  noiDung: string;
  tkDoiUng?: string;
  phatSinhNo?: number;
  phatSinhCo?: number;
  soDuNo?: number;
  soDuCo?: number;
  maDoiTuong?: string;
  tenDoiTuong?: string;
  maDoiTuong2?: string;
  tenDoiTuong2?: string;
  maKhoanMuc?: string;
  tenKhoanMuc?: string;
  maDuAn?: string;
  tenDuAn?: string;
  maBoPhan?: string;
  tenBoPhan?: string;
  maNhanVien?: string;
  tenNhanVien?: string;
  maDoi?: string;
  tenDoi?: string;
  maSanPham?: string;
  tenSanPham?: string;
  maDongTien?: string;
  tenDongTien?: string;
  maLoaiGiaoDich?: string;
  tenLoaiGiaoDich?: string;
  maNghiepVu?: string;
  tenNghiepVu?: string;
}

export type ChooserGroup =
  | 'Cơ bản'
  | 'Chứng từ'
  | 'Số phát sinh'
  | 'Số dư'
  | 'Đối tượng'
  | 'Phân loại'
  | 'Khác';

export interface ColumnDef {
  key: string;
  title: string;
  dataIndex: string;
  group: ChooserGroup;
  parentHeader?: 'Chứng từ' | 'Số phát sinh' | 'Số dư';
  width?: number;
  align?: 'left' | 'right' | 'center';
  ellipsis?: boolean;
  render?: (value: unknown, row: DisplayRow) => React.ReactNode;
  defaultVisible: boolean;
}

const fmt = (v?: number) =>
  v && v !== 0
    ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(v)
    : '';

const amount = (value: unknown) => fmt(value as number | undefined);

// Số hiệu phiếu: với dòng phát sinh, hiển thị link mở trang sửa phiếu ở tab mới.
const soPhieuLink = (value: unknown, row: DisplayRow): React.ReactNode => {
  const soPhieu = value as string | undefined;
  if (row.kind !== 'entry' || !soPhieu) return soPhieu ?? '';
  const href = `/chung-tu/nhat-ky-chung/${encodeURIComponent(soPhieu)}/sua`;
  return React.createElement(
    'a',
    {
      href,
      target: '_blank',
      rel: 'noopener noreferrer',
      title: 'Mở phiếu để sửa (tab mới)',
    },
    soPhieu,
  );
};

export const REGISTRY: ColumnDef[] = [
  { key: 'ngay', title: 'Ngày ghi sổ', dataIndex: 'ngay', group: 'Cơ bản', width: 110, defaultVisible: true },
  { key: 'soPhieu', title: 'Số hiệu', dataIndex: 'soPhieu', group: 'Chứng từ', parentHeader: 'Chứng từ', width: 110, render: soPhieuLink, defaultVisible: true },
  { key: 'ngayChungTu', title: 'Ngày tháng', dataIndex: 'ngayChungTu', group: 'Chứng từ', parentHeader: 'Chứng từ', width: 110, defaultVisible: true },
  { key: 'noiDung', title: 'Diễn giải', dataIndex: 'noiDung', group: 'Cơ bản', ellipsis: true, defaultVisible: true },
  { key: 'tkDoiUng', title: 'TK đối ứng', dataIndex: 'tkDoiUng', group: 'Cơ bản', width: 110, align: 'center', defaultVisible: true },

  { key: 'maDoiTuong', title: 'Mã đối tượng', dataIndex: 'maDoiTuong', group: 'Đối tượng', width: 130, defaultVisible: false },
  { key: 'tenDoiTuong', title: 'Tên đối tượng', dataIndex: 'tenDoiTuong', group: 'Đối tượng', width: 180, defaultVisible: false },
  { key: 'maDoiTuong2', title: 'Mã ĐT2', dataIndex: 'maDoiTuong2', group: 'Đối tượng', width: 130, defaultVisible: false },
  { key: 'tenDoiTuong2', title: 'Tên ĐT2', dataIndex: 'tenDoiTuong2', group: 'Đối tượng', width: 180, defaultVisible: false },

  { key: 'maKhoanMuc', title: 'Mã khoản mục', dataIndex: 'maKhoanMuc', group: 'Phân loại', width: 130, defaultVisible: false },
  { key: 'tenKhoanMuc', title: 'Tên khoản mục', dataIndex: 'tenKhoanMuc', group: 'Phân loại', width: 180, defaultVisible: false },
  { key: 'maDuAn', title: 'Mã dự án', dataIndex: 'maDuAn', group: 'Phân loại', width: 130, defaultVisible: false },
  { key: 'tenDuAn', title: 'Tên dự án', dataIndex: 'tenDuAn', group: 'Phân loại', width: 180, defaultVisible: false },
  { key: 'maBoPhan', title: 'Mã bộ phận', dataIndex: 'maBoPhan', group: 'Phân loại', width: 130, defaultVisible: false },
  { key: 'tenBoPhan', title: 'Tên bộ phận', dataIndex: 'tenBoPhan', group: 'Phân loại', width: 180, defaultVisible: false },
  { key: 'maNhanVien', title: 'Mã nhân viên', dataIndex: 'maNhanVien', group: 'Phân loại', width: 130, defaultVisible: false },
  { key: 'tenNhanVien', title: 'Tên nhân viên', dataIndex: 'tenNhanVien', group: 'Phân loại', width: 180, defaultVisible: false },
  { key: 'maDoi', title: 'Mã đội', dataIndex: 'maDoi', group: 'Phân loại', width: 130, defaultVisible: false },
  { key: 'tenDoi', title: 'Tên đội', dataIndex: 'tenDoi', group: 'Phân loại', width: 180, defaultVisible: false },

  { key: 'maSanPham', title: 'Mã sản phẩm', dataIndex: 'maSanPham', group: 'Khác', width: 130, defaultVisible: false },
  { key: 'tenSanPham', title: 'Tên sản phẩm', dataIndex: 'tenSanPham', group: 'Khác', width: 180, defaultVisible: false },
  { key: 'maDongTien', title: 'Mã dòng tiền', dataIndex: 'maDongTien', group: 'Khác', width: 130, defaultVisible: false },
  { key: 'tenDongTien', title: 'Tên dòng tiền', dataIndex: 'tenDongTien', group: 'Khác', width: 180, defaultVisible: false },
  { key: 'maLoaiGiaoDich', title: 'Mã loại GD', dataIndex: 'maLoaiGiaoDich', group: 'Khác', width: 130, defaultVisible: false },
  { key: 'tenLoaiGiaoDich', title: 'Tên loại GD', dataIndex: 'tenLoaiGiaoDich', group: 'Khác', width: 180, defaultVisible: false },
  { key: 'maNghiepVu', title: 'Mã nghiệp vụ', dataIndex: 'maNghiepVu', group: 'Khác', width: 130, defaultVisible: false },
  { key: 'tenNghiepVu', title: 'Tên nghiệp vụ', dataIndex: 'tenNghiepVu', group: 'Khác', width: 180, defaultVisible: false },

  { key: 'phatSinhNo', title: 'Nợ', dataIndex: 'phatSinhNo', group: 'Số phát sinh', parentHeader: 'Số phát sinh', width: 140, align: 'right', render: amount, defaultVisible: true },
  { key: 'phatSinhCo', title: 'Có', dataIndex: 'phatSinhCo', group: 'Số phát sinh', parentHeader: 'Số phát sinh', width: 140, align: 'right', render: amount, defaultVisible: true },
  { key: 'soDuNo', title: 'Nợ', dataIndex: 'soDuNo', group: 'Số dư', parentHeader: 'Số dư', width: 140, align: 'right', render: amount, defaultVisible: true },
  { key: 'soDuCo', title: 'Có', dataIndex: 'soDuCo', group: 'Số dư', parentHeader: 'Số dư', width: 140, align: 'right', render: amount, defaultVisible: true },
];

export function defaultVisibleKeys(): string[] {
  return REGISTRY.filter((c) => c.defaultVisible).map((c) => c.key);
}

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

const browserStorage = (): StorageLike | undefined =>
  typeof localStorage !== 'undefined' ? localStorage : undefined;

/** ID công ty đang chọn, lấy từ chính storage (key `current_tenant`). */
function currentTenantScope(storage: StorageLike): string {
  try {
    const raw = storage.getItem(TENANT_STORAGE_KEY);
    if (!raw) return NO_TENANT_SCOPE;
    const tenantId = (JSON.parse(raw) as { tenantId?: unknown } | null)?.tenantId;
    return typeof tenantId === 'string' && tenantId !== '' ? tenantId : NO_TENANT_SCOPE;
  } catch {
    return NO_TENANT_SCOPE;
  }
}

// Khoá lưu tách theo công ty: `sct-visible-columns:{tenantId}`.
const scopedStorageKey = (storage: StorageLike): string =>
  `${STORAGE_KEY}:${currentTenantScope(storage)}`;

export function loadVisibleKeys(storage: StorageLike | undefined = browserStorage()): string[] {
  if (!storage) return defaultVisibleKeys();
  try {
    const raw = storage.getItem(scopedStorageKey(storage));
    if (!raw) return defaultVisibleKeys();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((k) => typeof k !== 'string')) {
      return defaultVisibleKeys();
    }
    const known = new Set(REGISTRY.map((c) => c.key));
    const filtered = parsed.filter((k: string) => known.has(k));
    return filtered.length ? filtered : defaultVisibleKeys();
  } catch {
    return defaultVisibleKeys();
  }
}

export function saveVisibleKeys(
  keys: string[],
  storage: StorageLike | undefined = browserStorage(),
): void {
  if (!storage) return;
  storage.setItem(scopedStorageKey(storage), JSON.stringify(keys));
}

function leafColumn(c: ColumnDef): ColumnType<DisplayRow> {
  return {
    title: c.title,
    dataIndex: c.dataIndex,
    width: c.width,
    align: c.align,
    ellipsis: c.ellipsis,
    render: c.render,
  };
}

/**
 * Dựng cột Antd từ tập key đang bật, theo đúng thứ tự REGISTRY.
 * Các cột liền kề cùng parentHeader được gộp dưới một header cha.
 */
export function buildAntdColumns(visibleKeys: string[]): ColumnsType<DisplayRow> {
  const visible = REGISTRY.filter((c) => visibleKeys.includes(c.key));
  const cols: ColumnsType<DisplayRow> = [];
  let i = 0;
  while (i < visible.length) {
    const c = visible[i];
    if (!c.parentHeader) {
      cols.push(leafColumn(c));
      i += 1;
      continue;
    }
    const header = c.parentHeader;
    const children: ColumnsType<DisplayRow> = [];
    while (i < visible.length && visible[i].parentHeader === header) {
      children.push(leafColumn(visible[i]));
      i += 1;
    }
    cols.push({ title: header, children });
  }
  return cols;
}

/** Dựng các dòng hiển thị (đầu kỳ / phát sinh / cộng / cuối kỳ) cho một report. */
export function buildDisplayRows(report: SoChiTietReport): DisplayRow[] {
  const rows: DisplayRow[] = [];
  rows.push({
    key: 'opening', kind: 'opening', noiDung: 'Số dư đầu kỳ',
    soDuNo: report.soDuDauKyNo, soDuCo: report.soDuDauKyCo,
  });
  report.rows.forEach((r, i) => {
    rows.push({
      ...r,
      key: `e${i}`,
      kind: 'entry',
      ngay: r.ngay ? dayjs(r.ngay).format('DD/MM/YYYY') : undefined,
      ngayChungTu: r.ngayChungTu ? dayjs(r.ngayChungTu).format('DD/MM/YYYY') : undefined,
    });
  });
  rows.push({
    key: 'cong', kind: 'cong', noiDung: 'Cộng số phát sinh',
    phatSinhNo: report.tongPhatSinhNo, phatSinhCo: report.tongPhatSinhCo,
  });
  rows.push({
    key: 'cuoi', kind: 'cuoi', noiDung: 'Số dư cuối kỳ',
    soDuNo: report.soDuCuoiKyNo, soDuCo: report.soDuCuoiKyCo,
  });
  return rows;
}
