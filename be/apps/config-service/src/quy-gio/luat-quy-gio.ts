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
import { PhanBoOt, traHeSo } from '../don-cham-cong/luat-don';


/** Bảng tra MỞ — thêm loại ngày là thêm một khoá cấu hình, không phải sửa kiểu. */
export type HeSoTichQuy = Record<string, number>;

/** Mặc định bằng đúng sàn BLLĐ 2019 Đ98.1 cho ba loại ngày; `ngay_dem` theo
 *  mẫu 03-LĐTL (xem spec P4.2b §8.1). Công ty khai khác thì sửa config. */
export const HE_SO_TICH_MAC_DINH: HeSoTichQuy = {
  ngay_thuong: 1.5,
  ngay_nghi: 2.0,
  ngay_le: 3.0,
  ngay_dem: 1.5,
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

/**
 * SỐ CHỮ SỐ THẬP PHÂN của MỌI con số giờ được LƯU hoặc HIỂN THỊ (review
 * nhánh, IMPORTANT 2).
 *
 * Vì sao phải làm tròn ở đâu đó: `tinhSoGioOt()` trả `(phutDen - phutTu)/60`,
 * nên bất kỳ đơn nào không rơi đúng mốc nửa giờ đều cho ra một phân số nhị
 * phân KHÔNG kết thúc (2h20' = 2.333…). `gioTichTuDonOt()` nhân tiếp
 * 1.5/2.0/3.0 rồi `soGioTich +=` cộng dồn, và sai số bám theo suốt vòng đời
 * quỹ. Hậu quả đã đo được trên nhánh: nhân viên thấy "Bạn còn
 * 8.333333333333334 giờ nghỉ bù"; `doiSoat()` báo lệch ~1e-15 trên ~22% quỹ
 * HOÀN TOÀN ĐÚNG (đúng con số mà `ops/README.md` bảo vận hành chạy sau
 * rollout để xác nhận KHÔNG lệch); và `phanBoFifo()` từ chối đúng số dư nó
 * vừa hiển thị với câu vô lý "cần 8.333333333333334 giờ, chỉ còn
 * 8.333333333333334 giờ".
 *
 * Vì sao ĐÚNG 2 chữ số:
 *  - 0.01 giờ = 36 giây. Đơn từ trong repo nhập theo PHÚT (`gioTu`/`gioDen`
 *    dạng "HH:mm"), nên 36 giây đã mịn hơn hạt dữ liệu đầu vào — không có
 *    thông tin thật nào bị mất.
 *  - Không có số chữ số thập phân HỮU HẠN nào biểu diễn được 1 phút
 *    (1/60 = 0.0166…) một cách chính xác, nên "làm tròn đủ mịn rồi dừng" là
 *    lựa chọn duy nhất; thêm chữ số chỉ đẩy sai số xuống thấp hơn chứ không
 *    khử được nó, mà lại làm con số hiện ra khó đọc.
 *  - 2 chữ số cũng là hạt mà giao diện hiện ("8.33 giờ") và là hạt mà bảng
 *    lương P4.2b sẽ nhân với đơn giá — một số dư lưu 2 chữ số quy ra tiền
 *    không bao giờ lệch quá nửa xu.
 *
 * LÀM TRÒN Ở BIÊN, không rải khắp nơi: nhân hệ số xong mới làm tròn (làm
 * tròn `soGioOt` TRƯỚC khi nhân sẽ biến 2h20' × 3.0 = 7.00 thành 2.33 × 3 =
 * 6.99 — mất 0.01 giờ thật của người lao động).
 */
export const SO_LE_GIO = 2;

/** Ngưỡng "coi như bằng nhau" cho giờ. Nhỏ hơn nửa đơn vị lưu trữ (0.005)
 *  vài bậc độ lớn, nhưng lớn hơn dư nhị phân (~1e-15) rất nhiều — nên nó chỉ
 *  nuốt sai số máy, không bao giờ nuốt một chênh lệch nghiệp vụ thật. */
export const EPSILON_GIO = 1e-9;

/**
 * Làm tròn một con số giờ về `SO_LE_GIO` chữ số thập phân.
 *
 * Trả `0` chứ không `-0` khi kết quả bằng không: `Object.is(-0, 0)` là
 * `false`, nên một `-0` lọt vào số dư sẽ làm `toBe(0)` trong test đỏ và làm
 * `JSON` gửi xuống FE ra "-0" — cả hai đều là nhiễu vô nghĩa.
 */
export function lamTronGio(soGio: number): number {
  const heSo = 10 ** SO_LE_GIO;
  const kq = Math.round(soGio * heSo) / heSo;
  return kq === 0 ? 0 : kq;
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
 * Cộng theo `phanBoOt` khi đơn có (đơn nộp từ P4.2b trở đi): mỗi phần dùng hệ
 * số SNAPSHOT trên chính nó, KHÔNG tra lại cấu hình — sửa cấu hình sau không
 * được đổi giờ của đơn đã duyệt, cùng lập luận đã ghi ở
 * `don-cham-cong.service.ts` về việc snapshot ngay lúc tạo đơn.
 *
 * Đơn cũ (chưa backfill) rơi về đường một-phần, tra `heSoTichQuy` qua
 * `traHeSo()` — BẢNG TRA, không `if/else` ba nhánh. Khuôn if/else cũ khoá cứng
 * ba loại vào mã nguồn: `ngay_dem` rơi nhầm về hệ số ngày thường dù cấu hình
 * đã khai đủ. Loại thật sự lạ vẫn rơi về `ngay_thuong` — hệ số THẤP nhất, để
 * việc ai đó thêm loại mới mà quên cấu hình không thành tự tặng giờ.
 *
 * BIÊN LÀM TRÒN của chiều tích quỹ: nhân hệ số XONG rồi mới làm tròn, TỪNG
 * PHẦN một (xem `SO_LE_GIO`). 2h20' ngày lễ = 2.3333…× 3.0 = 6.99999…→ 7.00,
 * đúng con số con người tính nhẩm ra; làm tròn trước khi nhân cho 6.99.
 */
export function gioTichTuDonOt(input: {
  soGioOt: number;
  loaiNgayOt: string;
  heSoTichQuy: HeSoTichQuy;
  phanBoOt?: PhanBoOt[];
}): number {
  if (input.phanBoOt?.length) {
    return input.phanBoOt.reduce(
      (tong, p) => tong + lamTronGio(p.soGio * p.heSoTichQuy),
      0,
    );
  }

  return lamTronGio(
    input.soGioOt * traHeSo(input.heSoTichQuy, input.loaiNgayOt),
  );
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
 *
 * (review nhánh, IMPORTANT 2) `conCan` được so với `EPSILON_GIO` chứ không
 * với 0: khi số cần trải qua ≥2 kỳ tích, `conCan -= lay` cộng dồn sai số nhị
 * phân, nên một yêu cầu ĐÚNG BẰNG số dư đang hiển thị có thể kết thúc ở
 * `conCan = 4.4e-16 > 0` và bị từ chối với câu vô nghĩa "cần X giờ, chỉ còn
 * X giờ". Số trong câu lỗi cũng làm tròn — người đọc câu đó là HR, không
 * phải người gỡ lỗi dấu phẩy động.
 */
export function phanBoFifo(
  quyKhaDung: QuyKhaDung[],
  soGioCan: number,
): PhanBoQuyGio[] {
  if (soGioCan <= EPSILON_GIO) return [];

  const theoHan = [...quyKhaDung].sort((a, b) =>
    a.hanDung < b.hanDung ? -1 : a.hanDung > b.hanDung ? 1 : 0,
  );

  const ketQua: PhanBoQuyGio[] = [];
  let conCan = soGioCan;

  for (const q of theoHan) {
    if (conCan <= EPSILON_GIO) break;
    if (q.soGioConLai <= EPSILON_GIO) continue;

    const lay = Math.min(q.soGioConLai, conCan);
    // Con số ĐI RA (được lưu thành `phanBoQuyGio` snapshot trên đơn) làm
    // tròn; con số ĐANG TRỪ DẦN (`conCan`) thì KHÔNG — làm tròn `conCan` sẽ
    // vừa có thể phóng đại phần còn thiếu (16.666→16.67) vừa có thể nuốt mất
    // giờ thật của NLĐ. Sai số nhị phân còn lại được `EPSILON_GIO` chặn ở
    // câu lệnh dưới, đúng chỗ nó gây hại.
    ketQua.push({
      balanceId: q.balanceId,
      kyTich: q.kyTich,
      soGio: lamTronGio(lay),
    });
    conCan -= lay;
  }

  if (conCan > EPSILON_GIO) {
    const co = lamTronGio(soGioCan - conCan);
    throw new Error(
      `Quỹ giờ làm thêm không đủ: cần ${lamTronGio(soGioCan)} giờ, chỉ còn ${co} giờ`,
    );
  }

  return ketQua;
}
