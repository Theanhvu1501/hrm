/**
 * Ba hàm thuần tính luật cho đơn tăng ca / nghỉ phép — không DB, không
 * NestJS. Kết quả của các hàm này được lưu (snapshot) thẳng vào bản ghi đơn
 * nên phải đúng ngay từ đây: sai ở tầng này là sai số trên phiếu lương.
 *
 * Dùng `Date.UTC` để dựng mốc ngày và `getUTCDay()` để lấy thứ trong tuần —
 * không `new Date("YYYY-MM-DD")` rồi `getDay()`, vì cách sau đọc theo múi
 * giờ của tiến trình chạy nó; máy chủ đặt ở UTC-5 sẽ đọc lùi một ngày. Cùng
 * lý do đã ghi ở `ban-ghi-cham-cong/thoi-gian.util.ts`.
 */
import { hhmmSangPhut } from '../ban-ghi-cham-cong/thoi-gian.util';

/**
 * Giá trị SEED cho `CauHinhLuong.lamThem.heSoTra`. KHÔNG phải nguồn sự thật
 * lúc chạy — nguồn sự thật là cấu hình của từng công ty (nền tảng đa tenant,
 * mỗi công ty một mức thoả thuận). Đọc hằng số này lúc tính là quay lại đúng
 * cái hardcode mà P4.2b tồn tại để gỡ.
 *
 * `ngay_dem: 1.5` theo mẫu 03-LĐTL chủ sản phẩm cung cấp. Thấp hơn sàn
 * NĐ 145/2020 Đ57.2 (ngày thường đêm ≥ 200%) — xem spec P4.2b §8.1.
 */
export const HE_SO_OT_MAC_DINH: Record<string, number> = {
  ngay_thuong: 1.5,
  ngay_nghi: 2.0,
  ngay_le: 3.0,
  ngay_dem: 1.5,
};

/** BLLĐ 2019 Đ106 định nghĩa ban đêm là 22:00–06:00. */
export const KHUNG_GIO_DEM_MAC_DINH = { tu: '22:00', den: '06:00' };

/**
 * Giờ thuộc nhiều loại thì loại đứng TRƯỚC thắng. Lễ > nghỉ > đêm > thường
 * nghĩa là làm đêm ngày lễ vẫn ăn hệ số lễ — không bao giờ trả thấp hơn làm
 * ban ngày cùng ngày đó.
 */
export const UU_TIEN_LOAI_MAC_DINH = [
  'ngay_le',
  'ngay_nghi',
  'ngay_dem',
  'ngay_thuong',
];

/** Loại nào được tách phần chênh miễn thuế TNCN (P4.2c đọc). Mặc định chỉ ca
 *  đêm, theo sheet `Tính thuế TNCN` — hẹp hơn TT 111/2013 Đ3.1.i, xem spec §8.2. */
export const MIEN_THUE_CHENH_MAC_DINH = ['ngay_dem'];

/**
 * Chuỗi mở, KHÔNG phải union suy từ hằng số: thêm một loại ngày phải là thêm
 * một dòng cấu hình, không phải một lần sửa kiểu rồi deploy.
 */
export type LoaiNgayOt = string;

/**
 * Tra hệ số của một loại ngày. MỌI nơi đọc hệ số phải đi qua đây — `if/else`
 * ba nhánh (khuôn cũ ở `luat-quy-gio.ts`) là thứ khoá cứng danh sách loại vào
 * mã nguồn.
 *
 * Loại lạ rơi về `ngay_thuong` — hệ số THẤP nhất. Rơi về hệ số cao là tự tặng
 * tiền/giờ cho người nộp đơn khi ai đó thêm loại mới mà quên cấu hình. Bảng
 * rỗng rơi về 1.0 thay vì `undefined`: `undefined` nhân ra `NaN`, mà `NaN` đi
 * qua `lamTronGio()`/`lamTronTheo()` vẫn là `NaN` rồi nằm im trong DB.
 */
export function traHeSo(bang: Record<string, number>, loai: string): number {
  return bang?.[loai] ?? bang?.ngay_thuong ?? 1;
}

/** 0=CN … 6=T7 của một chuỗi "YYYY-MM-DD", đọc trên trục UTC thuần. */
function thuTrongTuan(ngay: string): number {
  const [nam, thang, ngayTrongThang] = ngay.split('-').map(Number);
  return new Date(Date.UTC(nam, thang - 1, ngayTrongThang)).getUTCDay();
}

/**
 * Suy hệ số OT từ NGÀY — không cho người nộp đơn tự chọn, vì chọn tay thì họ
 * chọn sai (không thuộc luật) hoặc chọn cao hơn thực tế.
 *
 * Thứ tự kiểm là phần cốt lõi: `laNgayLe` phải kiểm TRƯỚC ngày nghỉ tuần, vì
 * lễ rơi vào Chủ nhật vẫn phải là 3.0 chứ không phải 2.0 — kiểm ngược lại là
 * trả thiếu tiền cho đúng ngày đáng được trả cao nhất.
 */
export function suyHeSoOt(input: {
  ngay: string;
  laNgayLe: boolean;
  ngayLamViecTrongTuan?: number[];
}): { loaiNgayOt: LoaiNgayOt; heSoOt: number } {
  if (input.laNgayLe) {
    return {
      loaiNgayOt: 'ngay_le',
      heSoOt: traHeSo(HE_SO_OT_MAC_DINH, 'ngay_le'),
    };
  }

  // Rỗng/undefined = CHƯA CẤU HÌNH, không phải "nghỉ tất cả các ngày" — cùng
  // quy ước đã ghi ở màn hồ sơ nhân viên. Hiểu ngược lại thì mọi đơn OT của
  // người chưa được gán lịch làm việc sẽ âm thầm thành hệ số 2.0.
  const daCauHinh = !!input.ngayLamViecTrongTuan && input.ngayLamViecTrongTuan.length > 0;
  if (daCauHinh) {
    const thu = thuTrongTuan(input.ngay);
    const laNgayLamViec = input.ngayLamViecTrongTuan!.includes(thu);
    if (!laNgayLamViec) {
      return {
        loaiNgayOt: 'ngay_nghi',
        heSoOt: traHeSo(HE_SO_OT_MAC_DINH, 'ngay_nghi'),
      };
    }
  }

  return {
    loaiNgayOt: 'ngay_thuong',
    heSoOt: traHeSo(HE_SO_OT_MAC_DINH, 'ngay_thuong'),
  };
}

/**
 * Số giờ OT giữa hai mốc "HH:mm". Ca OT qua đêm là chuyện thường (ví dụ
 * 22:00 → 02:00) nên nếu mốc kết thúc "nhỏ hơn" mốc bắt đầu thì hiểu là nó
 * đã sang ngày hôm sau, cộng thêm 24h thay vì trừ thẳng ra số âm.
 */
export function tinhSoGioOt(gioTu: string, gioDen: string): number {
  const phutTu = hhmmSangPhut(gioTu);
  let phutDen = hhmmSangPhut(gioDen);
  if (phutDen < phutTu) {
    phutDen += 24 * 60;
  }
  return (phutDen - phutTu) / 60;
}

/**
 * Đếm số ngày nghỉ phép trong khoảng [tuNgay, denNgay] (tính cả hai đầu):
 * bỏ qua ngày lễ và bỏ qua ngày không thuộc lịch làm việc trong tuần (nếu đã
 * cấu hình — rỗng/undefined nghĩa là chưa cấu hình, không loại ngày nào).
 *
 * `buoi` (sáng/chiều → nửa ngày) chỉ có ý nghĩa khi đơn đúng MỘT ngày; đơn
 * nhiều ngày thì bỏ qua vì không rõ nửa ngày áp cho ngày nào trong khoảng.
 */
export function tinhSoNgayNghi(input: {
  tuNgay: string;
  denNgay: string;
  buoi?: string;
  ngayLeTrongKhoang: string[];
  ngayLamViecTrongTuan?: number[];
}): number {
  const tapNgayLe = new Set(input.ngayLeTrongKhoang);
  const daCauHinhLichLamViec =
    !!input.ngayLamViecTrongTuan && input.ngayLamViecTrongTuan.length > 0;

  const [namTu, thangTu, ngayTu] = input.tuNgay.split('-').map(Number);
  const [namDen, thangDen, ngayDen] = input.denNgay.split('-').map(Number);
  const moc = Date.UTC(namTu, thangTu - 1, ngayTu);
  const mocDen = Date.UTC(namDen, thangDen - 1, ngayDen);

  let soNgay = 0;
  for (let t = moc; t <= mocDen; t += 24 * 60 * 60 * 1000) {
    const d = new Date(t);
    const hai = (n: number) => String(n).padStart(2, '0');
    const ngayStr = `${d.getUTCFullYear()}-${hai(d.getUTCMonth() + 1)}-${hai(d.getUTCDate())}`;

    if (tapNgayLe.has(ngayStr)) {
      continue;
    }
    if (daCauHinhLichLamViec && !input.ngayLamViecTrongTuan!.includes(d.getUTCDay())) {
      continue;
    }

    soNgay += 1;
  }

  // `buoi` chỉ áp dụng khi đơn tính đúng đúng một ngày làm việc.
  if (soNgay === 1 && (input.buoi === 'sang' || input.buoi === 'chieu')) {
    return 0.5;
  }

  return soNgay;
}
