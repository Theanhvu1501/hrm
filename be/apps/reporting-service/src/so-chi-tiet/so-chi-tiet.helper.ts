import type { NhatKyChungEntry } from '@app/dto';
import {
  matchLoaiBySnapshot,
  type LoaiMatcher,
} from '../shared/doi-tuong-loai.helper';

/**
 * Tín hiệu lọc "đối tượng rỗng": chỉ lấy bút toán CHƯA gắn đối tượng. FE truyền
 * giá trị này khi bấm dòng "Chưa xác định đối tượng" ở báo cáo tài chính.
 */
export const DOI_TUONG_TRONG = '__none__';

/**
 * Tập mã TK liên quan: chính nó + mọi TK con cháu (theo tiền tố mã).
 * Đồng nhất quy tắc với buildSoDuTree của FE.
 */
export function computeRelevantCodes(
  accounts: Array<{ ma: string }>,
  maTaiKhoan: string,
): Set<string> {
  const set = new Set<string>();
  for (const a of accounts) {
    if (a.ma === maTaiKhoan || a.ma.startsWith(maTaiKhoan)) {
      set.add(a.ma);
    }
  }
  set.add(maTaiKhoan);
  return set;
}

export interface SoChiTietRow {
  ngay: Date;
  soPhieu: string;
  ngayChungTu: Date;
  noiDung: string;
  tkDoiUng: string;
  phatSinhNo: number;
  phatSinhCo: number;
  soDuNo: number;
  soDuCo: number;
  // Trường danhMuc (tùy chọn) phục vụ chọn cột hiển thị
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

export interface SoChiTietReport {
  taiKhoan: { ma: string; ten: string; loai: string };
  doiTuong?: { ma: string; ten: string };
  soDuDauKyNo: number;
  soDuDauKyCo: number;
  rows: SoChiTietRow[];
  tongPhatSinhNo: number;
  tongPhatSinhCo: number;
  soDuCuoiKyNo: number;
  soDuCuoiKyCo: number;
}

export interface OpeningRow {
  maTaiKhoan: string;
  duNo: number;
  duCo: number;
  chiTietMa?: string;
  chiTietType?: string;
}

function getTkNo(v: NhatKyChungEntry): string {
  return v.taiKhoanNo || v.danhMuc?.taiKhoanNo?.ma || '';
}
function getTkCo(v: NhatKyChungEntry): string {
  return v.taiKhoanCo || v.danhMuc?.taiKhoanCo?.ma || '';
}

/** Tách số dư có dấu thành cặp Nợ/Có theo loại tài khoản. */
function splitBalance(
  signed: number,
  loai: string,
): { no: number; co: number } {
  if (loai === 'NO') {
    return signed >= 0 ? { no: signed, co: 0 } : { no: 0, co: -signed };
  }
  return signed >= 0 ? { no: 0, co: signed } : { no: -signed, co: 0 };
}

/**
 * Build sổ chi tiết tài khoản.
 * - account: TK đã chọn (cha hoặc leaf), quyết định loai để tính số dư.
 * - relevantCodes: tập mã TK gộp (computeRelevantCodes).
 * - opening: các dòng số dư đầu kỳ nhập tay (đã có chiTietMa).
 * - maDoiTuong: lọc theo đối tượng (tùy chọn).
 */
export function buildSoChiTiet(
  account: { ma: string; ten: string; loai: string; chiTietTheo?: string },
  relevantCodes: Set<string>,
  vouchers: NhatKyChungEntry[],
  opening: OpeningRow[],
  maDoiTuong: string | undefined,
  startDate: Date,
  endDate: Date,
  match: LoaiMatcher = matchLoaiBySnapshot,
): SoChiTietReport {
  const loai = account.loai;
  const chiTietTheo = account.chiTietTheo;

  // "Chưa xác định đối tượng" — ĐỒNG NHẤT với báo cáo tài chính
  // (buildDoiTuongSoTien): đối tượng rỗng HOẶC không khớp chiTietTheo của TK.
  // Nhờ vậy bấm dòng "chưa xác định" ở báo cáo ra đúng các phiếu đó. Việc khớp
  // loại do `match` quyết định (đối tượng đa loại → tra danh mục, không tin
  // snapshot.loai).
  const isChuaXacDinh = (ma?: string, dtLoai?: string): boolean =>
    !(ma && (!chiTietTheo || match(ma, dtLoai, chiTietTheo)));

  // Khớp đối tượng: không lọc → nhận tất cả; '__none__' → thuộc "chưa xác định";
  // ngược lại → khớp đúng mã.
  const matchDt = (ma: string | undefined, dtLoai?: string): boolean =>
    !maDoiTuong
      ? true
      : maDoiTuong === DOI_TUONG_TRONG
        ? isChuaXacDinh(ma, dtLoai)
        : ma === maDoiTuong;

  const legsOf = (
    v: NhatKyChungEntry,
  ): Array<{ no: number; co: number; tkDoiUng: string }> => {
    const tkNo = getTkNo(v);
    const tkCo = getTkCo(v);
    // Đối tượng bên Nợ ghi ở doiTuong; bên Có ghi ở doiTuong2
    // (fallback doiTuong cho dữ liệu cũ — đồng nhất buildDoiTuongSoTien).
    const dtNo = v.danhMuc?.doiTuong;
    const dtCo = v.danhMuc?.doiTuong2 ?? v.danhMuc?.doiTuong;
    const out: Array<{ no: number; co: number; tkDoiUng: string }> = [];
    if (relevantCodes.has(tkNo) && matchDt(dtNo?.ma, dtNo?.loai)) {
      out.push({ no: v.soTien, co: 0, tkDoiUng: tkCo });
    }
    if (relevantCodes.has(tkCo) && matchDt(dtCo?.ma, dtCo?.loai)) {
      out.push({ no: 0, co: v.soTien, tkDoiUng: tkNo });
    }
    return out;
  };

  const delta = (no: number, co: number) =>
    loai === 'NO' ? no - co : co - no;

  // 1) Số dư đầu kỳ nhập tay
  let manualSigned = 0;
  for (const o of opening) {
    if (!relevantCodes.has(o.maTaiKhoan)) continue;
    if (!matchDt(o.chiTietMa, o.chiTietType)) continue;
    manualSigned += delta(Number(o.duNo) || 0, Number(o.duCo) || 0);
  }

  // 2) Phát sinh trước kỳ → cộng vào đầu kỳ
  let priorSigned = 0;
  for (const v of vouchers) {
    if (new Date(v.ngay).getTime() >= startDate.getTime()) continue;
    for (const leg of legsOf(v)) priorSigned += delta(leg.no, leg.co);
  }

  const soDuDauKySigned = manualSigned + priorSigned;

  // 3) Phát sinh trong kỳ
  const periodVouchers = vouchers
    .filter((v) => {
      const t = new Date(v.ngay).getTime();
      return t >= startDate.getTime() && t <= endDate.getTime();
    })
    .sort((a, b) => new Date(a.ngay).getTime() - new Date(b.ngay).getTime());

  let soDu = soDuDauKySigned;
  let tongPhatSinhNo = 0;
  let tongPhatSinhCo = 0;
  const rows: SoChiTietRow[] = [];

  for (const v of periodVouchers) {
    for (const leg of legsOf(v)) {
      soDu += delta(leg.no, leg.co);
      tongPhatSinhNo += leg.no;
      tongPhatSinhCo += leg.co;
      const s = splitBalance(soDu, loai);
      const dm = v.danhMuc;
      rows.push({
        ngay: new Date(v.ngay),
        soPhieu: v.soPhieu,
        ngayChungTu: new Date(v.ngay),
        noiDung: v.noiDung,
        tkDoiUng: leg.tkDoiUng,
        phatSinhNo: leg.no,
        phatSinhCo: leg.co,
        soDuNo: s.no,
        soDuCo: s.co,
        maDoiTuong: dm?.doiTuong?.ma,
        tenDoiTuong: dm?.doiTuong?.ten,
        maDoiTuong2: dm?.doiTuong2?.ma,
        tenDoiTuong2: dm?.doiTuong2?.ten,
        maKhoanMuc: dm?.khoanMuc?.ma,
        tenKhoanMuc: dm?.khoanMuc?.ten,
        maDuAn: dm?.duAn?.ma,
        tenDuAn: dm?.duAn?.ten,
        maBoPhan: dm?.boPhan?.ma,
        tenBoPhan: dm?.boPhan?.ten,
        maNhanVien: dm?.nhanVien?.ma,
        tenNhanVien: dm?.nhanVien?.ten,
        maDoi: dm?.doi?.ma,
        tenDoi: dm?.doi?.ten,
        maSanPham: dm?.sanPham?.ma,
        tenSanPham: dm?.sanPham?.ten,
        maDongTien: dm?.dongTien?.ma,
        tenDongTien: dm?.dongTien?.ten,
        maLoaiGiaoDich: dm?.loaiGiaoDich?.ma,
        tenLoaiGiaoDich: dm?.loaiGiaoDich?.ten,
        maNghiepVu: dm?.nghiepVu?.ma,
        tenNghiepVu: dm?.nghiepVu?.ten,
      });
    }
  }

  const dauKy = splitBalance(soDuDauKySigned, loai);
  const cuoiKy = splitBalance(soDu, loai);

  return {
    taiKhoan: { ma: account.ma, ten: account.ten, loai },
    soDuDauKyNo: dauKy.no,
    soDuDauKyCo: dauKy.co,
    rows,
    tongPhatSinhNo,
    tongPhatSinhCo,
    soDuCuoiKyNo: cuoiKy.no,
    soDuCuoiKyCo: cuoiKy.co,
  };
}

/**
 * Build sổ chi tiết cho nhiều tài khoản từ một lần fetch dữ liệu.
 * - codes: danh sách mã TK cần dựng (đã resolve từ 'all' hoặc list).
 * - Bỏ qua mã không có trong danh mục, và TK rỗng (không số dư đầu kỳ, không phát sinh).
 */
export function buildSoChiTietMulti(
  codes: string[],
  accounts: Array<{ ma: string; ten: string; loai: string; chiTietTheo?: string }>,
  vouchers: NhatKyChungEntry[],
  opening: OpeningRow[],
  maDoiTuong: string | undefined,
  startDate: Date,
  endDate: Date,
  match: LoaiMatcher = matchLoaiBySnapshot,
): SoChiTietReport[] {
  const reports: SoChiTietReport[] = [];
  for (const code of codes) {
    const account = accounts.find((a) => a.ma === code);
    if (!account) continue;
    const relevantCodes = computeRelevantCodes(accounts, code);
    const report = buildSoChiTiet(
      {
        ma: account.ma,
        ten: account.ten,
        loai: account.loai,
        chiTietTheo: account.chiTietTheo,
      },
      relevantCodes,
      vouchers,
      opening,
      maDoiTuong,
      startDate,
      endDate,
      match,
    );
    const isEmpty =
      report.rows.length === 0 &&
      report.soDuDauKyNo === 0 &&
      report.soDuDauKyCo === 0;
    if (isEmpty) continue;
    reports.push(report);
  }
  return reports;
}
