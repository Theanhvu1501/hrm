/**
 * Toàn bộ luật quỹ giờ làm thêm — hàm thuần, không DB, không NestJS.
 *
 * ĐƠN VỊ: mọi con số ở đây là "giờ nghỉ được hưởng", tức giờ OT ĐÃ nhân hệ số
 * tích. Nhân đúng một lần ở `gioTichTuDonOt()`, sau đó mọi phép cộng trừ là
 * giờ thẳng. Lưu giờ thô rồi nhân lúc tiêu thì mỗi lần nghỉ bù phải biết giờ
 * đó đến từ ngày lễ hay ngày thường — quỹ thành mớ hỗn hợp không cộng lại được.
 *
 * Dùng `Date.UTC` + `getUTC*` cho mọi phép tính ngày, cùng lý do đã ghi ở
 * `luat-don.ts`: `new Date("YYYY-MM-DD").getDay()` đọc theo múi giờ tiến trình.
 */

export interface HeSoTichQuy {
  ngay_thuong: number;
  ngay_nghi: number;
  ngay_le: number;
}

/** Mặc định bằng đúng sàn BLLĐ 2019 Đ98.1 — công ty khai cao hơn thì sửa config. */
export const HE_SO_TICH_MAC_DINH: HeSoTichQuy = {
  ngay_thuong: 1.5,
  ngay_nghi: 2.0,
  ngay_le: 3.0,
};

/** Mốc "không bao giờ hết hạn". Ngày THẬT chứ không phải null — xem docblock hàm. */
export const HAN_DUNG_VO_HAN = '9999-12-31';

export interface QuyKhaDung {
  balanceId: string;
  kyTich: string;
  hanDung: string;
  soGioConLai: number;
}

export interface PhanBoQuyGio {
  balanceId: string;
  kyTich: string;
  soGio: number;
}

const hai = (n: number) => String(n).padStart(2, '0');

/**
 * Hạn dùng của một kỳ tích = ngày CUỐI của tháng thứ `soThangHanDung` sau đó.
 *
 * `soThangHanDung = null` trả `HAN_DUNG_VO_HAN` thay vì `null`: một giá trị
 * ngày thật giữ cho mọi so sánh chuỗi (`hanDung < homNay`) và mọi index sắp
 * xếp vẫn chạy bình thường, thay vì phải rải nhánh `if (hanDung === null)`
 * khắp service và query.
 */
export function hanDungCuaKy(
  kyTich: string,
  soThangHanDung: number | null,
): string {
  if (soThangHanDung === null) return HAN_DUNG_VO_HAN;

  const [nam, thang] = kyTich.split('-').map(Number);
  // Ngày 0 của tháng kế tiếp = ngày cuối của tháng đích. Date.UTC tự dồn năm.
  const cuoi = new Date(Date.UTC(nam, thang + soThangHanDung, 0));
  return `${cuoi.getUTCFullYear()}-${hai(cuoi.getUTCMonth() + 1)}-${hai(cuoi.getUTCDate())}`;
}

/**
 * Giờ nghỉ được hưởng sinh ra từ MỘT đơn làm thêm đã duyệt.
 *
 * Loại ngày lạ rơi về hệ số NGÀY THƯỜNG — hệ số thấp nhất. Rơi về hệ số cao
 * là tự tặng giờ cho người nộp đơn khi có ai đó thêm loại ngày mới mà quên
 * cập nhật cấu hình.
 */
export function gioTichTuDonOt(input: {
  soGioOt: number;
  loaiNgayOt: string;
  heSoTichQuy: HeSoTichQuy;
}): number {
  const heSo =
    input.loaiNgayOt === 'ngay_le'
      ? input.heSoTichQuy.ngay_le
      : input.loaiNgayOt === 'ngay_nghi'
        ? input.heSoTichQuy.ngay_nghi
        : input.heSoTichQuy.ngay_thuong;

  return input.soGioOt * heSo;
}

/**
 * Chia `soGioCan` vào các quỹ khả dụng, quỹ SẮP HẾT HẠN trước.
 *
 * FIFO theo `hanDung` chứ không theo `kyTich`: hai kỳ có thể chung hạn dùng
 * nếu công ty đổi `soThangHanDung` giữa chừng, và cái quyết định "mất giờ oan"
 * là hạn dùng chứ không phải thứ tự tích.
 *
 * Thiếu số dư thì NÉM chứ không trả phân bổ thiếu: nơi gọi giữ chỗ theo đúng
 * danh sách trả về, nên một phân bổ thiếu nghĩa là cho nghỉ nhiều hơn quỹ có.
 */
export function phanBoFifo(
  quyKhaDung: QuyKhaDung[],
  soGioCan: number,
): PhanBoQuyGio[] {
  if (soGioCan <= 0) return [];

  const theoHan = [...quyKhaDung].sort((a, b) =>
    a.hanDung < b.hanDung ? -1 : a.hanDung > b.hanDung ? 1 : 0,
  );

  const ketQua: PhanBoQuyGio[] = [];
  let conCan = soGioCan;

  for (const q of theoHan) {
    if (conCan <= 0) break;
    if (q.soGioConLai <= 0) continue;

    const lay = Math.min(q.soGioConLai, conCan);
    ketQua.push({ balanceId: q.balanceId, kyTich: q.kyTich, soGio: lay });
    conCan -= lay;
  }

  if (conCan > 0) {
    const co = soGioCan - conCan;
    throw new Error(
      `Quỹ giờ làm thêm không đủ: cần ${soGioCan} giờ, chỉ còn ${co} giờ`,
    );
  }

  return ketQua;
}
