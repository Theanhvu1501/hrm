// Dựng ma trận báo cáo "Tình hình thực hiện nghĩa vụ chính sách" (bản rút gọn).
// Hàm thuần — không phụ thuộc Nest DI để dễ unit test (xem spec).

export interface NvcsRow {
  tt: string;
  chiTieu: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  luyKe: number;
}

export interface NvcsSection {
  ma: 'TNDN' | 'GTGT' | 'TNCN' | 'BHXH';
  tieuDe: string;
  rows: NvcsRow[];
}

export interface NghiaVuChinhSach {
  nam: number;
  sections: NvcsSection[];
}

/** Các chỉ tiêu TNDN cần cho 1 quý (TNDNQuyData khớp về cấu trúc). */
export interface NvcsTndnQuy {
  dt511: number;
  dt515: number;
  dt711: number;
  cp632: number;
  cp641: number;
  cp642: number;
  cp811: number;
  tongChiPhi: number;
  lnTruocThue: number;
  chiPhiKhongTru: number;
  thuNhapTinhThue: number;
  thueTNDN: number;
  lnSauThue: number;
}

export interface NvcsTndnReport {
  quy: NvcsTndnQuy[];
  luyKe: NvcsTndnQuy;
}

/** VAT thuần theo từng quý (4 phần tử) — input để dựng section GTGT. */
export interface NvcsVatQuy {
  vatDauVao: number;
  vatDauRa: number;
  vatPhaiNop: number;
  vatConKhauTru: number;
}

/** Điều chỉnh thuế: mỗi field là mảng 4 quý. */
export interface NvcsDieuChinh {
  thueTNCN?: number[];
  bhxh3383?: number[];
  bhyt3384?: number[];
  bhtn3386?: number[];
}

const num = (v: unknown): number => Number(v) || 0;

/** Lấy giá trị quý i (0-3) của 1 mảng điều chỉnh. */
const dc = (arr: number[] | undefined, i: number): number => num((arr || [])[i]);

/**
 * Dựng 1 dòng từ selector trên TNDN: 4 quý lấy từ tndn.quy, lũy kế từ tndn.luyKe.
 */
function tndnRow(
  tt: string,
  chiTieu: string,
  tndn: NvcsTndnReport,
  sel: (q: NvcsTndnQuy) => number,
): NvcsRow {
  const q = tndn.quy;
  return {
    tt,
    chiTieu,
    q1: num(sel(q[0])),
    q2: num(sel(q[1])),
    q3: num(sel(q[2])),
    q4: num(sel(q[3])),
    luyKe: num(sel(tndn.luyKe)),
  };
}

/** Dựng 1 dòng từ 4 giá trị quý; lũy kế = tổng 4 quý. */
function sumRow(tt: string, chiTieu: string, vals: number[]): NvcsRow {
  const [q1, q2, q3, q4] = vals.map(num);
  return { tt, chiTieu, q1, q2, q3, q4, luyKe: q1 + q2 + q3 + q4 };
}

/**
 * Dựng đủ 4 section của báo cáo nghĩa vụ chính sách.
 * @param vatPerQuy mảng 4 phần tử VAT thuần theo quý.
 */
export function buildNvcsSections(
  tndn: NvcsTndnReport,
  vatPerQuy: NvcsVatQuy[],
  dieuChinh: NvcsDieuChinh,
): NvcsSection[] {
  const v = vatPerQuy;

  const tndnSection: NvcsSection = {
    ma: 'TNDN',
    tieuDe: 'THUẾ TNDN',
    rows: [
      tndnRow('1', 'Doanh thu thuần', tndn, (q) => q.dt511 + q.dt515 + q.dt711),
      tndnRow('2', 'Giá vốn', tndn, (q) => q.cp632),
      tndnRow('3', 'Chi phí bán hàng', tndn, (q) => q.cp641),
      tndnRow('4', 'Chi phí quản lý', tndn, (q) => q.cp642),
      tndnRow('5', 'Chi phí khác', tndn, (q) => q.cp811),
      tndnRow('6', 'Tổng CP phát sinh', tndn, (q) => q.tongChiPhi),
      tndnRow('7', 'Lợi nhuận trước thuế', tndn, (q) => q.lnTruocThue),
      tndnRow('8', 'Chi phí không được trừ', tndn, (q) => q.chiPhiKhongTru),
      tndnRow('9', 'Thu nhập tính thuế', tndn, (q) => q.thuNhapTinhThue),
      tndnRow('10', 'Thuế TNDN phải nộp', tndn, (q) => q.thueTNDN),
      tndnRow('11', 'Lợi nhuận sau thuế', tndn, (q) => q.lnSauThue),
    ],
  };

  // VAT còn kỳ trước: q1=0, q(i)=vatConKhauTru của quý trước; luyKe=0.
  const gtgtSection: NvcsSection = {
    ma: 'GTGT',
    tieuDe: 'THUẾ GTGT',
    rows: [
      {
        tt: '1',
        chiTieu: 'VAT còn kỳ trước',
        q1: 0,
        q2: num(v[0]?.vatConKhauTru),
        q3: num(v[1]?.vatConKhauTru),
        q4: num(v[2]?.vatConKhauTru),
        luyKe: 0,
      },
      sumRow('2', 'VAT bán ra', [
        v[0]?.vatDauRa ?? 0,
        v[1]?.vatDauRa ?? 0,
        v[2]?.vatDauRa ?? 0,
        v[3]?.vatDauRa ?? 0,
      ]),
      sumRow('3', 'VAT mua vào', [
        v[0]?.vatDauVao ?? 0,
        v[1]?.vatDauVao ?? 0,
        v[2]?.vatDauVao ?? 0,
        v[3]?.vatDauVao ?? 0,
      ]),
      sumRow('4', 'VAT còn phải nộp', [
        v[0]?.vatPhaiNop ?? 0,
        v[1]?.vatPhaiNop ?? 0,
        v[2]?.vatPhaiNop ?? 0,
        v[3]?.vatPhaiNop ?? 0,
      ]),
    ],
  };

  const tncnSection: NvcsSection = {
    ma: 'TNCN',
    tieuDe: 'THUẾ TNCN',
    rows: [
      sumRow('1', 'Thuế TNCN phải nộp', [
        dc(dieuChinh.thueTNCN, 0),
        dc(dieuChinh.thueTNCN, 1),
        dc(dieuChinh.thueTNCN, 2),
        dc(dieuChinh.thueTNCN, 3),
      ]),
    ],
  };

  const bhxhSection: NvcsSection = {
    ma: 'BHXH',
    tieuDe: 'BHXH',
    rows: [
      sumRow(
        '1',
        'Bảo hiểm phải nộp',
        [0, 1, 2, 3].map(
          (i) =>
            dc(dieuChinh.bhxh3383, i) +
            dc(dieuChinh.bhyt3384, i) +
            dc(dieuChinh.bhtn3386, i),
        ),
      ),
    ],
  };

  return [tndnSection, gtgtSection, tncnSection, bhxhSection];
}
