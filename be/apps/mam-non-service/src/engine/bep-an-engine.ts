export function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export interface DiemDanhLite { lopMa?: string; goiAnMa?: string; soTreAnThucTe: number | string; congThucCode?: string; }
export interface CongThucLite { chiTiet: { hangHoaMa: string; hangHoaTen: string; donViTinh?: string; dinhLuong: number | string }[]; }
export interface TieuHaoItem { hangHoaMa: string; hangHoaTen: string; donViTinh?: string; soLuong: number; }
export interface DinhMucLite { phamVi?: string; doiTuongMa?: string; mucTien: number | string; }
export interface NhapChiTietLite { hangHoaMa: string; soLuong: number | string; thanhTien: number | string; }

export function tinhTieuHao(rows: DiemDanhLite[], congThucByCode: Record<string, CongThucLite>): TieuHaoItem[] {
  const acc = new Map<string, TieuHaoItem>();
  for (const row of rows ?? []) {
    const ct = row.congThucCode ? congThucByCode[row.congThucCode] : undefined;
    if (!ct) continue;
    const soSuat = toNumber(row.soTreAnThucTe);
    for (const line of ct.chiTiet ?? []) {
      const cur = acc.get(line.hangHoaMa) ?? {
        hangHoaMa: line.hangHoaMa, hangHoaTen: line.hangHoaTen, donViTinh: line.donViTinh, soLuong: 0,
      };
      cur.soLuong += soSuat * toNumber(line.dinhLuong);
      acc.set(line.hangHoaMa, cur);
    }
  }
  return [...acc.values()];
}

function matchMucTien(row: DiemDanhLite, dinhMucList: DinhMucLite[]): number {
  const key = row.lopMa ?? row.goiAnMa;
  const specific = (dinhMucList ?? []).find((d) => d.phamVi !== 'CHUNG' && d.doiTuongMa && d.doiTuongMa === key);
  if (specific) return toNumber(specific.mucTien);
  const chung = (dinhMucList ?? []).find((d) => d.phamVi === 'CHUNG');
  return chung ? toNumber(chung.mucTien) : 0;
}

export function tinhNganSach(rows: DiemDanhLite[], dinhMucList: DinhMucLite[]): number {
  return (rows ?? []).reduce((sum, row) => sum + toNumber(row.soTreAnThucTe) * matchMucTien(row, dinhMucList), 0);
}

export function tinhDonGiaBinhQuan(nhapChiTiet: NhapChiTietLite[]): Record<string, number> {
  const agg = new Map<string, { sl: number; tt: number }>();
  for (const r of nhapChiTiet ?? []) {
    const cur = agg.get(r.hangHoaMa) ?? { sl: 0, tt: 0 };
    cur.sl += toNumber(r.soLuong);
    cur.tt += toNumber(r.thanhTien);
    agg.set(r.hangHoaMa, cur);
  }
  const out: Record<string, number> = {};
  for (const [ma, { sl, tt }] of agg) out[ma] = sl > 0 ? tt / sl : 0;
  return out;
}

export function tinhChiPhiThuc(tieuHao: TieuHaoItem[], donGiaBq: Record<string, number>): number {
  return (tieuHao ?? []).reduce((sum, t) => sum + t.soLuong * (donGiaBq[t.hangHoaMa] ?? 0), 0);
}

export function tinhHaoPhi(nganSach: number, chiPhiThuc: number, nguongPct = 0): { chenhLech: number; haoPhiPct: number; vuot: boolean } {
  const chenhLech = chiPhiThuc - nganSach;
  const haoPhiPct = nganSach > 0 ? (chenhLech / nganSach) * 100 : 0;
  const nguong = nganSach > 0 ? nganSach * (1 + nguongPct / 100) : 0;
  const vuot = nganSach > 0 ? chiPhiThuc > nguong : chiPhiThuc > 0;
  return { chenhLech, haoPhiPct, vuot };
}
