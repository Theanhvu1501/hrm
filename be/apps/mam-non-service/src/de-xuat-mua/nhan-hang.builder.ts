import { DeXuatMuaThucPham } from '@app/entities';

// Tài khoản mặc định MVP (cấu hình hoá sau).
const TK_KHO = { ma: '152', ten: 'Nguyên liệu, vật liệu' };
const TK_PHAI_TRA = { ma: '331', ten: 'Phải trả người bán' };

function toISODate(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Body cho POST voucher /nhat-ky-chung: Nợ 152 / Có 331, NCC ở doiTuong2. */
export function buildButToanNhanHang(dx: DeXuatMuaThucPham) {
  return {
    loai: 'PHIEU_CHI',
    ngay: toISODate(dx.ngayDeXuat),
    soTien: Number(dx.tongTien) || 0,
    noiDung: `Nhận thực phẩm từ ${dx.doiTuongTen ?? dx.doiTuongMa ?? 'NCC'} (đề xuất ${dx.soPhieu})`,
    danhMuc: {
      taiKhoanNo: { ...TK_KHO },
      taiKhoanCo: { ...TK_PHAI_TRA },
      doiTuong2: { ma: dx.doiTuongMa, ten: dx.doiTuongTen, loai: 'NHA_CUNG_CAP' },
    },
  };
}

/** Body cho POST kho /phieu: phiếu NHẬP, chiTiet map từ đề xuất. */
export function buildPhieuNhapKho(dx: DeXuatMuaThucPham) {
  return {
    loaiPhieu: 'NHAP',
    ngayHachToan: toISODate(dx.ngayDeXuat),
    doiTuongMa: dx.doiTuongMa,
    doiTuongTen: dx.doiTuongTen,
    dienGiai: `Nhập thực phẩm theo đề xuất ${dx.soPhieu}`,
    tongTien: Number(dx.tongTien) || 0,
    chiTiet: (dx.chiTiet ?? []).map((ct) => ({
      stt: ct.stt,
      hangHoaMa: ct.hangHoaMa,
      hangHoaTen: ct.hangHoaTen,
      donViTinh: ct.donViTinh,
      soLuong: ct.soLuong,
      donGia: ct.donGia,
      thanhTien: ct.thanhTien,
      tkNo: '152',
      tkCo: '331',
    })),
  };
}
