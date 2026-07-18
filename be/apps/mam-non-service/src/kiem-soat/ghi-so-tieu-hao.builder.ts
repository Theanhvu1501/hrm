import { TieuHaoItem } from '../engine/bep-an-engine';

// Tài khoản mặc định MVP (cấu hình hoá sau).
const TK_GIA_VON = { ma: '632', ten: 'Giá vốn hàng bán' };
const TK_KHO = { ma: '152', ten: 'Nguyên liệu, vật liệu' };

function toISODate(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Body cho POST voucher /nhat-ky-chung: Nợ 632 / Có 152 = chi phí thực kỳ. */
export function buildButToanGiaVon(chiPhiThuc: number, ngay: Date | string, dienGiai: string) {
  return {
    loai: 'PHIEU_CHI',
    ngay: toISODate(ngay),
    soTien: Number(chiPhiThuc) || 0,
    noiDung: dienGiai,
    danhMuc: { taiKhoanNo: { ...TK_GIA_VON }, taiKhoanCo: { ...TK_KHO } },
  };
}

/** Body cho POST kho /phieu: phiếu XUẤT, chiTiet = tiêu hao × đơn giá bình quân. */
export function buildPhieuXuatKho(
  tieuHao: TieuHaoItem[],
  donGiaBq: Record<string, number>,
  ngay: Date | string,
) {
  const chiTiet = (tieuHao ?? []).map((t, i) => {
    const donGia = donGiaBq[t.hangHoaMa] ?? 0;
    return {
      stt: i + 1,
      hangHoaMa: t.hangHoaMa,
      hangHoaTen: t.hangHoaTen,
      donViTinh: t.donViTinh,
      soLuong: t.soLuong,
      donGia,
      thanhTien: t.soLuong * donGia,
      tkNo: '632',
      tkCo: '152',
    };
  });
  return {
    loaiPhieu: 'XUAT',
    ngayHachToan: toISODate(ngay),
    dienGiai: 'Xuất kho tiêu hao ăn theo tiêu hao',
    tongTien: chiTiet.reduce((s, c) => s + c.thanhTien, 0),
    chiTiet,
  };
}
