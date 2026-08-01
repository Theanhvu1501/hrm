/** Mốc "không bao giờ hết hạn" do BE sinh — xem `hanDungCuaKy()`. */
export const HAN_DUNG_VO_HAN = "9999-12-31";

const MOT_NGAY = 24 * 60 * 60 * 1000;

/** Dùng Date.UTC để không lệch một ngày theo múi giờ trình duyệt. */
function moc(ngay: string): number {
  const [n, t, d] = ngay.split("-").map(Number);
  return Date.UTC(n, t - 1, d);
}

export function conBaoNhieuNgay(hanDung: string, homNay: string): number {
  return Math.round((moc(hanDung) - moc(homNay)) / MOT_NGAY);
}

export type MucCanhBao = "het_han" | "sap_het" | "binh_thuong";

export function mucCanhBao(hanDung: string, homNay: string): MucCanhBao {
  if (hanDung === HAN_DUNG_VO_HAN) return "binh_thuong";

  const con = conBaoNhieuNgay(hanDung, homNay);
  if (con < 0) return "het_han";
  if (con < 30) return "sap_het";
  return "binh_thuong";
}
