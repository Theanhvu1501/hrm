import type { ChieuTot, DonVi } from './baoCao.types';

const HAU_TO: Record<DonVi, string> = {
  phan_tram: '%',
  nguoi: ' người',
  ngay: ' ngày',
  gio: ' giờ',
  tien: ' đ',
  luot: ' lượt',
};

/** Đơn vị nào hiển thị phần thập phân — số người/lượt luôn là số nguyên. */
const SO_LE: Record<DonVi, number> = {
  phan_tram: 1,
  nguoi: 0,
  ngay: 1,
  gio: 1,
  tien: 0,
  luot: 0,
};

/**
 * Định dạng theo chuẩn Việt Nam: dấu phẩy thập phân, dấu chấm phân nhóm nghìn.
 * Vd 86.4 kiểu `phan_tram` → "86,4%"; 4200000 kiểu `tien` → "4.200.000 đ".
 */
export function dinhDangGiaTri(giaTri: number, donVi: DonVi): string {
  const so = giaTri.toLocaleString('vi-VN', {
    minimumFractionDigits: SO_LE[donVi],
    maximumFractionDigits: SO_LE[donVi],
  });
  return `${so}${HAU_TO[donVi]}`;
}

/** Số trần trên nhãn của mark trong biểu đồ — không kèm hậu tố cho đỡ chật. */
export function dinhDangNhanBieuDo(giaTri: number, donVi: DonVi): string {
  return giaTri.toLocaleString('vi-VN', {
    minimumFractionDigits: SO_LE[donVi],
    maximumFractionDigits: SO_LE[donVi],
  });
}

export type HuongBienDong = 'tot' | 'xau' | 'khong_doi';

export interface BienDong {
  /** Hiệu tuyệt đối, đã làm tròn theo số lẻ của đơn vị. */
  chenhLech: number;
  /**
   * Phần trăm thay đổi so với kỳ trước. `null` khi kỳ trước bằng 0 — chia cho
   * 0 ra Infinity, và "tăng vô hạn phần trăm" là con số vô nghĩa trên báo cáo.
   */
  phanTramThayDoi: number | null;
  huong: HuongBienDong;
}

/**
 * So kỳ này với kỳ trước.
 *
 * `chieuTot` quyết định màu chứ không phải dấu của chênh lệch: tỷ lệ nghỉ việc
 * GIẢM là tin tốt, tỷ lệ vượt thử việc GIẢM là tin xấu. Thiếu `chieuTot` thì
 * mọi thay đổi đều trung tính.
 */
export function tinhBienDong(
  giaTri: number,
  kyTruoc: number | undefined,
  chieuTot: ChieuTot | undefined,
  donVi: DonVi,
): BienDong | null {
  if (kyTruoc === undefined || kyTruoc === null) return null;

  const heSo = 10 ** SO_LE[donVi];
  const chenhLech = Math.round((giaTri - kyTruoc) * heSo) / heSo;
  const phanTramThayDoi =
    kyTruoc === 0 ? null : Math.round(((giaTri - kyTruoc) / Math.abs(kyTruoc)) * 1000) / 10;

  let huong: HuongBienDong = 'khong_doi';
  if (chenhLech !== 0 && chieuTot) {
    const tangLen = chenhLech > 0;
    huong = tangLen === (chieuTot === 'tang') ? 'tot' : 'xau';
  }

  return { chenhLech, phanTramThayDoi, huong };
}
