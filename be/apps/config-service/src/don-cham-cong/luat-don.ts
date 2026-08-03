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
// `import type` bị xoá lúc biên dịch, nên file luật vẫn không có phụ thuộc
// runtime vào TypeORM — chỉ mượn hình dạng dữ liệu đã khai trên entity.
import type { PhanBoOt } from '@app/entities';

export type { PhanBoOt };

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
 * Suy LOẠI NGÀY từ ngày — không trả hệ số, vì hệ số nay phụ thuộc cấu hình
 * của từng công ty VÀ phụ thuộc cả việc giờ đó có rơi vào khung đêm không.
 * Tách hai việc: hàm này biết lịch, `chiaGioOtTheoLoai()` biết đồng hồ.
 *
 * Không cho người nộp đơn tự chọn — chọn tay thì họ chọn sai (không thuộc
 * luật) hoặc chọn cao hơn thực tế.
 *
 * Thứ tự kiểm là phần cốt lõi: `laNgayLe` phải kiểm TRƯỚC ngày nghỉ tuần, vì
 * lễ rơi vào Chủ nhật vẫn phải là lễ — kiểm ngược lại là trả thiếu tiền cho
 * đúng ngày đáng được trả cao nhất.
 */
export function suyLoaiNgay(input: {
  ngay: string;
  laNgayLe: boolean;
  ngayLamViecTrongTuan?: number[];
}): LoaiNgayOt {
  if (input.laNgayLe) return 'ngay_le';

  // Rỗng/undefined = CHƯA CẤU HÌNH, không phải "nghỉ tất cả các ngày" — cùng
  // quy ước đã ghi ở màn hồ sơ nhân viên. Hiểu ngược lại thì mọi đơn OT của
  // người chưa được gán lịch làm việc sẽ âm thầm thành ngày nghỉ.
  const daCauHinh =
    !!input.ngayLamViecTrongTuan && input.ngayLamViecTrongTuan.length > 0;
  if (daCauHinh) {
    const thu = thuTrongTuan(input.ngay);
    if (!input.ngayLamViecTrongTuan!.includes(thu)) return 'ngay_nghi';
  }

  return 'ngay_thuong';
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
    phutDen += PHUT_MOT_NGAY;
  }
  return (phutDen - phutTu) / 60;
}

const PHUT_MOT_NGAY = 24 * 60;


/**
 * Loại đứng trước trong `uuTienLoai` thắng. Loại không có trong danh sách xếp
 * cuối chứ không bị loại bỏ — mất giờ của người lao động còn tệ hơn xếp sai
 * thứ tự.
 */
function chonTheoUuTien(ungVien: string[], uuTien: string[]): string {
  let tot = ungVien[0];
  let hang = uuTien.indexOf(tot);
  if (hang < 0) hang = Number.MAX_SAFE_INTEGER;
  for (const uv of ungVien.slice(1)) {
    let h = uuTien.indexOf(uv);
    if (h < 0) h = Number.MAX_SAFE_INTEGER;
    if (h < hang) {
      hang = h;
      tot = uv;
    }
  }
  return tot;
}

/**
 * Chẻ một đơn OT thành các phần theo loại ngày và khung giờ đêm.
 *
 * Cắt theo MỐC TUYỆT ĐỐI (phút kể từ nửa đêm của ngày đơn), KHÔNG so chuỗi
 * "HH:mm": khung đêm 22:00–06:00 vắt qua nửa đêm, nên ca 22:00→02:00 giao với
 * nó ở hai đoạn nếu nhìn theo mặt đồng hồ. So chuỗi thì '02:00' < '22:00' và
 * ra 0 giờ đêm.
 *
 * KHÔNG làm tròn `soGio`. Docblock `SO_LE_GIO` (`luat-quy-gio.ts`) đã đo được
 * hậu quả: làm tròn số giờ TRƯỚC khi nhân hệ số biến 2h20' × 3.0 = 7.00 thành
 * 2.33 × 3 = 6.99 — mất 0,01 giờ thật của người lao động. Chẻ thành nhiều
 * phần rồi làm tròn từng phần là đúng cái bẫy đó, nhân lên theo số phần. Biên
 * làm tròn ở nơi tiêu thụ, SAU phép nhân.
 *
 * Hệ quả: `Σ kết quả[].soGio === tinhSoGioOt(gioTu, gioDen)` đúng TUYỆT ĐỐI.
 */
export function chiaGioOtTheoLoai(input: {
  gioTu: string;
  gioDen: string;
  loaiNgay: LoaiNgayOt;
  khungGioDem: { tu: string; den: string } | null;
  uuTienLoai: string[];
  heSoTra: Record<string, number>;
  heSoTichQuy: Record<string, number>;
}): PhanBoOt[] {
  const batDau = hhmmSangPhut(input.gioTu);
  let ketThuc = hhmmSangPhut(input.gioDen);
  if (ketThuc < batDau) ketThuc += PHUT_MOT_NGAY;

  const moc = new Set<number>([batDau, ketThuc]);
  const khoangDem: Array<[number, number]> = [];

  if (input.khungGioDem) {
    const demTu = hhmmSangPhut(input.khungGioDem.tu);
    let demDen = hhmmSangPhut(input.khungGioDem.den);
    if (demDen <= demTu) demDen += PHUT_MOT_NGAY; // khung vắt qua nửa đêm

    // Khung đêm lặp mỗi 24h. Ca dài tối đa 24h (`tinhSoGioOt` cộng đúng một
    // ngày), nên ba bản sao k ∈ {-1,0,1} phủ hết mọi giao cắt có thể có.
    for (const k of [-1, 0, 1]) {
      const t = demTu + k * PHUT_MOT_NGAY;
      const d = demDen + k * PHUT_MOT_NGAY;
      khoangDem.push([t, d]);
      if (t > batDau && t < ketThuc) moc.add(t);
      if (d > batDau && d < ketThuc) moc.add(d);
    }
  }

  const cacMoc = [...moc].sort((a, b) => a - b);
  const ketQua: PhanBoOt[] = [];

  for (let i = 0; i < cacMoc.length - 1; i++) {
    const tu = cacMoc[i];
    const den = cacMoc[i + 1];
    const laDem = khoangDem.some(([t, d]) => tu >= t && den <= d);
    const loai = chonTheoUuTien(
      laDem ? [input.loaiNgay, 'ngay_dem'] : [input.loaiNgay],
      input.uuTienLoai,
    );
    const soGio = (den - tu) / 60;

    // Gộp hai đoạn liền kề cùng loại: ngày lễ thắng ca đêm nên 20:00→02:00 ra
    // ba đoạn nhưng cùng là `ngay_le` — biểu mẫu 03-LĐTL cần đúng một dòng.
    const cuoi = ketQua[ketQua.length - 1];
    if (cuoi && cuoi.loaiNgayOt === loai) {
      cuoi.soGio += soGio;
    } else {
      ketQua.push({
        loaiNgayOt: loai,
        soGio,
        heSoTra: traHeSo(input.heSoTra, loai),
        heSoTichQuy: traHeSo(input.heSoTichQuy, loai),
      });
    }
  }

  // Đoạn CUỐI gánh phần dư dấu phẩy động. Mỗi đoạn chia riêng cho 60 nên tổng
  // các phần không nhất thiết bằng đúng `(ketThuc - batDau)/60`: ca 21:40→02:20
  // chẻ thành 20' + 260' cho 4.666666666666666, còn 280' thẳng cho
  // 4.666666666666667 — lệch một ulp.
  //
  // Một ulp là vô nghĩa về nghiệp vụ nhưng KHÔNG vô nghĩa về hệ quả: quỹ giờ và
  // tiền lương đều cộng từ `phanBoOt`, còn màn đơn và bộ lọc đọc `soGioOt` suy
  // từ `tinhSoGioOt()`. Hai đường khác nhau ra hai con số khác nhau là thứ
  // không ai đối soát ra được. Ép bằng nhau tại đây, ở đúng chỗ sinh ra chúng.
  if (ketQua.length) {
    const tongDung = (ketThuc - batDau) / 60;
    const tongHienCo = ketQua.reduce((s, p) => s + p.soGio, 0);
    ketQua[ketQua.length - 1].soGio += tongDung - tongHienCo;
  }

  return ketQua;
}

/**
 * Ba trường dẫn xuất (`soGioOt`/`loaiNgayOt`/`heSoOt`) mà màn danh sách đơn,
 * bộ lọc và đường tích quỹ cũ đang đọc. Giữ chúng để không phải đổi cùng lúc
 * cả hình dạng dữ liệu lẫn mọi nơi tiêu thụ.
 *
 * Loại "đại diện" là phần chiếm NHIỀU GIỜ nhất; hoà thì lấy phần đầu, và
 * `chiaGioOtTheoLoai()` trả các phần theo thứ tự thời gian nên phần đầu là
 * phần bắt đầu sớm nhất — ổn định, không phụ thuộc thứ tự duyệt.
 */
export function gopPhanBoOt(phanBoOt: PhanBoOt[]): {
  soGioOt: number;
  loaiNgayOt: LoaiNgayOt;
  heSoOt: number;
} {
  if (!phanBoOt?.length) {
    return { soGioOt: 0, loaiNgayOt: 'ngay_thuong', heSoOt: 1 };
  }
  const soGioOt = phanBoOt.reduce((s, p) => s + p.soGio, 0);
  const troi = phanBoOt.reduce((a, b) => (b.soGio > a.soGio ? b : a));
  return { soGioOt, loaiNgayOt: troi.loaiNgayOt, heSoOt: troi.heSoTra };
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
