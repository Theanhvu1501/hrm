import { AttendanceRecord } from "@/services/attendanceRecordService";
import { AttendanceRequest } from "@/services/attendanceRequestService";
import { suySoCong } from "@/pages/cham-cong/cua-toi/ngayDangXem";
import { dauTuanCua, bayNgayTu, dichTuan } from "@/pages/cham-cong/cua-toi/lichTuan";

/**
 * Lịch tháng cho tab "Bảng công" của vỏ nhân viên (`/toi/bang-cong`).
 *
 * Thuần, không JSX — mọi phép tính ngày đi qua `lichTuan.ts` (dựng mốc bằng
 * `Date.UTC`), giữ đúng bất biến "không phụ thuộc múi giờ máy" mà lịch tuần
 * đã có. KHÔNG đọc `Date.now()`/`homNayVN()` ở đây — tháng và "hôm nay" đều
 * là tham số do màn hình truyền vào, để test được bằng bảng dữ liệu.
 *
 * CHƯA xử lý ngày lễ công ty ở v1: nhân viên thường không chắc có quyền đọc
 * `/config/ngay-le`, và `mauChamNgay`/`duLieuNgay` (lịch tuần) cũng cố tình bỏ
 * qua nguồn đó — xem comment ở `lichTuan.ts`. Ngày lễ hiện bị tính như ngày
 * thường không có bản ghi (đi làm bù trong tương lai sẽ cần lịch làm việc
 * theo ngày, không phải việc của lịch tháng này).
 */

/**
 * Ký hiệu hiện trên ô ngày: hai loại nghỉ có đơn, và ngày làm online. Không
 * dùng cho giải trình/OT (hai loại đó không đổi số công của ngày).
 */
export type KyHieuNghi = "P" | "B" | "OL";

const KY_HIEU_THEO_LOAI_DON: Record<"nghi_phep" | "nghi_bu", KyHieuNghi> = {
  nghi_phep: "P",
  nghi_bu: "B",
};

export interface ONgay {
  /** 'YYYY-MM-DD'. */
  ngay: string;
  /** Số ngày trong tháng (1-31), để in trên ô. */
  ngayTrongThang: number;
  /**
   * Luôn `true`: `tinhONgay` chỉ được gọi cho ô có ngày thật (ô đệm ngoài
   * tháng là chuỗi rỗng từ `luoiThang` và màn hình không gọi hàm này cho
   * chúng). Giữ trường này trong kiểu để component có chỗ neo nếu sau này
   * đổi cách gọi.
   */
  trongThang: boolean;
  /** Số công đã suy ra. `null` = đang trong ca (đã vào, chưa ra). */
  cong: number | null;
  /** Chỉ có khi ngày được phủ bởi một đơn nghỉ phép/nghỉ bù đã duyệt. */
  kyHieu?: KyHieuNghi;
  laCuoiTuan: boolean;
  /** Chuỗi hiện thẳng lên ô: '1' | '0.5' | '0' | 'N' | '•' (đang chờ) | '' (trống/mờ). */
  hienThi: string;
}

const HAI_CHU_SO = (n: number) => String(n).padStart(2, "0");

/** Số ngày của một tháng 'YYYY-MM', tính bằng UTC (ngày 0 của tháng sau). */
export function soNgayCuaThang(thang: string): number {
  const [nam, thangSo] = thang.split("-").map(Number);
  return new Date(Date.UTC(nam, thangSo, 0)).getUTCDate();
}

/** Tháng liền trước/sau `thang` ('YYYY-MM'), lệch `delta` tháng (âm = lùi). */
export function dichThang(thang: string, delta: number): string {
  const [nam, thangSo] = thang.split("-").map(Number);
  const d = new Date(Date.UTC(nam, thangSo - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${HAI_CHU_SO(d.getUTCMonth() + 1)}`;
}

/**
 * Lưới tuần của một tháng, tuần bắt đầu Thứ Hai.
 *
 * Mỗi tuần là mảng 7 phần tử 'YYYY-MM-DD'; ô thuộc tháng trước/sau (đệm cho
 * đủ hàng) là chuỗi rỗng. So sánh chuỗi ngày trực tiếp (`>=`/`<=`) là an toàn
 * vì định dạng 'YYYY-MM-DD' zero-pad sẵn thứ tự từ điển = thứ tự thời gian.
 */
export function luoiThang(thang: string): string[][] {
  const ngayDau = `${thang}-01`;
  const ngayCuoi = `${thang}-${HAI_CHU_SO(soNgayCuaThang(thang))}`;

  const dauTuanCuoiCung = dauTuanCua(ngayCuoi);
  const tuan: string[][] = [];
  let con = dauTuanCua(ngayDau);
  while (con <= dauTuanCuoiCung) {
    const bay = bayNgayTu(con);
    tuan.push(bay.map((n) => (n >= ngayDau && n <= ngayCuoi ? n : "")));
    con = dichTuan(con, 1);
  }
  return tuan;
}

/** Thứ Bảy/Chủ Nhật của `ngay`, tính bằng UTC. */
function laCuoiTuanNgay(ngay: string): boolean {
  const [nam, thang, ngayTrongThang] = ngay.split("-").map(Number);
  const thu = new Date(Date.UTC(nam, thang - 1, ngayTrongThang)).getUTCDay();
  return thu === 0 || thu === 6;
}

/**
 * Đơn nghỉ phép/nghỉ bù ĐÃ DUYỆT phủ `ngay` (helper nhỏ tách khỏi
 * `tinhONgay` để dễ đọc). Đơn khác loại (giải trình/làm thêm giờ) hoặc chưa
 * duyệt/bị từ chối đều không khớp — cố ý lọc lại `trangThai`/`loaiDon` ở đây
 * thay vì tin tưởng danh sách truyền vào đã lọc sẵn, để hàm tự đứng vững dù
 * gọi bằng `cuaToi()` chưa lọc.
 */
function donNghiPhuNgay(
  ngay: string,
  don: AttendanceRequest[]
): AttendanceRequest | undefined {
  return don.find((d) => {
    if (d.trangThai !== "da_duyet") return false;
    if (d.loaiDon !== "nghi_phep" && d.loaiDon !== "nghi_bu") return false;
    const denNgay = d.denNgay ?? d.ngay;
    return ngay >= d.ngay && ngay <= denNgay;
  });
}

/**
 * Ngày có đơn `lam_online` ĐÃ DUYỆT phủ lên hay không.
 *
 * Tách khỏi `donNghiPhuNgay` chứ không nới nó ra: đơn online là ngày LÀM, và
 * nó KHÔNG quyết định số công như đơn nghỉ — số công vẫn suy từ chấm công.
 */
function coDonOnlinePhuNgay(ngay: string, don: AttendanceRequest[]): boolean {
  return don.some((d) => {
    if (d.trangThai !== "da_duyet") return false;
    if (d.loaiDon !== "lam_online") return false;
    const denNgay = d.denNgay ?? d.ngay;
    return ngay >= d.ngay && ngay <= denNgay;
  });
}

/**
 * Tính dữ liệu hiển thị cho MỘT ngày trong lịch tháng.
 *
 * Luật, theo đúng thứ tự ưu tiên:
 * 1. Có đơn nghỉ phép/nghỉ bù ĐÃ DUYỆT phủ ngày đó → công theo đơn (`buoi`),
 *    kèm ký hiệu P/B.
 * 1b. Có đơn LÀM ONLINE đã duyệt VÀ có chấm công → ký hiệu OL, công vẫn suy
 *    từ chấm công (đơn online không tự phát công — cùng luật với backend
 *    `suy-ky-hieu.ts`).
 * 2. Ngày HÔM NAY (so với `homNay`) → công lấy từ `congHomNay` (đã tính sẵn
 *    bởi `/hom-nay`, MỚI hơn dải bản ghi cả tháng vốn chỉ nạp lại khi đổi
 *    tháng — giữ đúng lý do `duLieuNgay()` ở lịch tuần làm vậy).
 * 3. Ngày khác → suy từ `banGhiNgay` bằng CÙNG luật `suySoCong` của lịch
 *    tuần (`ngayDangXem.ts`): có vào+ra → 1, chỉ vào → null (đang trong ca),
 *    không có gì → 0.
 *
 * Hiển thị (`hienThi`):
 * - Có ký hiệu nghỉ → '1' hoặc '0.5'.
 * - Ngày TƯƠNG LAI (sau `homNay`) mà không có đơn và công suy ra 0 (tức
 *   không có dữ liệu gì) → '' (để trống/mờ), kể cả khi rơi vào cuối tuần —
 *   không được hiện 'N' cho một ngày còn chưa tới.
 * - `cong === null` (đang trong ca) → '•'.
 * - Cuối tuần, công = 0, không phải ngày tương lai → 'N' (nghỉ tuần, không
 *   tính công).
 * - Còn lại, công = 0 → '0'; công = 1 → '1'.
 */
export function tinhONgay(
  ngay: string,
  banGhiNgay: AttendanceRecord[],
  donDaDuyet: AttendanceRequest[],
  homNay: string,
  congHomNay: number | null
): ONgay {
  const laHomNay = ngay === homNay;
  const laTuongLai = ngay > homNay;
  const laCuoiTuan = laCuoiTuanNgay(ngay);

  const donNghi = donNghiPhuNgay(ngay, donDaDuyet);

  let cong: number | null;
  let kyHieu: KyHieuNghi | undefined;

  if (donNghi) {
    cong = donNghi.buoi === "sang" || donNghi.buoi === "chieu" ? 0.5 : 1;
    kyHieu = KY_HIEU_THEO_LOAI_DON[donNghi.loaiDon as "nghi_phep" | "nghi_bu"];
  } else {
    cong = laHomNay ? congHomNay : suySoCong(banGhiNgay);
    // Chỉ gắn OL khi ngày đó THẬT SỰ có công: `cong === 0` là ngày có đơn mà
    // không ai chấm — gắn ký hiệu vào đó là nói người ta đã làm online trong
    // khi bảng công của HR đang để trống ô đó chờ xử lý.
    if (cong !== 0 && coDonOnlinePhuNgay(ngay, donDaDuyet)) {
      kyHieu = "OL";
    }
  }

  let hienThi: string;
  if (kyHieu === "OL") {
    // OL đi theo công suy từ chấm công, nên phải qua đúng luật hiển thị của
    // ngày thường: `null` (đã vào, chưa ra) là '•', không phải '0.5'.
    hienThi = cong === null ? "•" : String(cong);
  } else if (kyHieu) {
    hienThi = cong === 1 ? "1" : "0.5";
  } else if (laTuongLai && cong === 0) {
    hienThi = "";
  } else if (cong === null) {
    hienThi = "•";
  } else if (cong === 0 && laCuoiTuan) {
    hienThi = "N";
  } else if (cong === 0) {
    hienThi = "0";
  } else {
    hienThi = String(cong);
  }

  return {
    ngay,
    ngayTrongThang: Number(ngay.slice(8, 10)),
    trongThang: true,
    cong,
    kyHieu,
    laCuoiTuan,
    hienThi,
  };
}
