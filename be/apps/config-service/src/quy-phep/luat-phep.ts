/**
 * Toàn bộ chính sách phép năm — hàm thuần, không DB, không NestJS.
 *
 * Mốc gốc của MỌI phép tính ở đây là `ngayVaoLam`, KHÔNG phải ngày lên chính
 * thức: NĐ 145/2020 Đ65.2 tính thời gian thử việc vào thời gian làm việc để
 * tính phép năm, với điều kiện NLĐ tiếp tục làm sau thử việc. Ngày lên chính
 * thức chỉ quyết định KHI NÀO quỹ được mở, không quyết định BAO NHIÊU.
 *
 * Dùng `Date.UTC` + `getUTC*` cho mọi phép tính ngày — không
 * `new Date("YYYY-MM-DD").getDay()`, vì cách đó đọc theo múi giờ tiến trình.
 */

/** Mức nền BLLĐ 2019 Đ113.1a. Công ty trả cao hơn thì sửa đúng dòng này. */
export const PHEP_CO_BAN = 12;
/** BLLĐ Đ114: cứ đủ 5 năm cho một NSDLĐ thì thêm 1 ngày. */
export const MOC_THAM_NIEN_NAM = 5;
/** NĐ 145 Đ66.2: làm ≥ 50% số ngày làm việc bình thường của tháng thì tính tròn 1 tháng. */
export const NGUONG_THANG_LE = 0.5;
/** Quỹ năm N dùng đến ngày này của năm N+1. */
export const HAN_DUNG_MMDD = '03-31';

export interface CanCuCapPhep {
  ngayVaoLam: string;
  soThang: number;
  thamNienNam: number;
  mucCaNam: number;
}

const MOT_NGAY = 24 * 60 * 60 * 1000;
const hai = (n: number) => String(n).padStart(2, '0');

function moc(ngay: string): number {
  const [nam, thang, ngayTrongThang] = ngay.split('-').map(Number);
  return Date.UTC(nam, thang - 1, ngayTrongThang);
}

/** Làm tròn LÊN bội số 0.5 — luôn có lợi cho NLĐ nên không có rủi ro pháp lý. */
export function lamTronLen05(x: number): number {
  return Math.ceil(x * 2) / 2;
}

/** Số năm TRỌN từ `ngayVaoLam` đến `den`. Thiếu một ngày là chưa đủ năm. */
export function demSoNamLamViec(input: { ngayVaoLam: string; den: string }): number {
  const [namVao, thangVao, ngayVao] = input.ngayVaoLam.split('-').map(Number);
  const [namDen, thangDen, ngayDen] = input.den.split('-').map(Number);

  let soNam = namDen - namVao;
  const chuaToiNgayKyNiem =
    thangDen < thangVao || (thangDen === thangVao && ngayDen < ngayVao);
  if (chuaToiNgayKyNiem) soNam -= 1;

  return Math.max(0, soNam);
}

/** Có phải ngày làm việc không. Lịch rỗng/undefined = CHƯA CẤU HÌNH ⇒ mọi ngày đều tính. */
function laNgayLamViec(t: number, ngayLamViecTrongTuan?: number[]): boolean {
  if (!ngayLamViecTrongTuan || ngayLamViecTrongTuan.length === 0) return true;
  return ngayLamViecTrongTuan.includes(new Date(t).getUTCDay());
}

/**
 * Số tháng của `nam` mà NV làm được ≥ NGUONG_THANG_LE số ngày làm việc bình
 * thường của tháng đó, tính từ `ngayVaoLam`.
 *
 * Ngưỡng phải so trên SỐ NGÀY LÀM VIỆC THẬT của đúng tháng đó, không so trên
 * "ngày thứ mấy của tháng": tháng bắt đầu vào Chủ nhật và tháng bắt đầu vào
 * thứ Năm cho ra kết quả khác nhau ở cùng một ngày vào làm.
 */
export function demThangLamViec(input: {
  ngayVaoLam: string;
  nam: number;
  ngayLamViecTrongTuan?: number[];
}): number {
  const mocVao = moc(input.ngayVaoLam);
  let soThang = 0;

  for (let thang = 1; thang <= 12; thang += 1) {
    const dauThang = Date.UTC(input.nam, thang - 1, 1);
    const cuoiThang = Date.UTC(input.nam, thang, 0); // ngày 0 của tháng sau = ngày cuối tháng này
    if (mocVao > cuoiThang) continue;

    let tongNgayLamViec = 0;
    let ngayLamViecConLai = 0;
    for (let t = dauThang; t <= cuoiThang; t += MOT_NGAY) {
      if (!laNgayLamViec(t, input.ngayLamViecTrongTuan)) continue;
      tongNgayLamViec += 1;
      if (t >= mocVao) ngayLamViecConLai += 1;
    }

    if (tongNgayLamViec > 0 && ngayLamViecConLai >= NGUONG_THANG_LE * tongNgayLamViec) {
      soThang += 1;
    }
  }

  return soThang;
}

/** Số ngày phép được cấp cho `nam`, kèm căn cứ để về sau còn giải thích được. */
export function tinhPhepDuocCap(input: {
  ngayVaoLam: string;
  nam: number;
  ngayLamViecTrongTuan?: number[];
}): { soNgay: number; canCuCap: CanCuCapPhep } {
  // Thâm niên tính đến 31/12 của năm được cấp — người tròn 5 năm vào tháng 6
  // vẫn được +1 ngay trong năm đó, đúng Đ114.
  const thamNienNam = demSoNamLamViec({
    ngayVaoLam: input.ngayVaoLam,
    den: `${input.nam}-12-31`,
  });
  const mucCaNam = PHEP_CO_BAN + Math.floor(thamNienNam / MOC_THAM_NIEN_NAM);
  const soThang = demThangLamViec(input);

  return {
    soNgay: lamTronLen05((mucCaNam / 12) * soThang),
    canCuCap: { ngayVaoLam: input.ngayVaoLam, soThang, thamNienNam, mucCaNam },
  };
}

export function hanDungCuaNam(nam: number): string {
  return `${nam + 1}-${HAN_DUNG_MMDD}`;
}
