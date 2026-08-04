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
 * Số ngày làm việc theo LỊCH của một tháng. Đây là MẪU SỐ của ngưỡng 50%.
 *
 * Vẫn theo lịch kể cả sau P3.10: "50% số ngày làm việc BÌNH THƯỜNG của tháng"
 * (NĐ 145 Đ66.2) là con số của lịch công ty, không của riêng một người. Chỉ TỬ
 * SỐ mới đổi từ lịch sang công thực tế.
 */
export function soNgayLamViecCuaThang(input: {
  nam: number;
  thang: number;
  ngayLamViecTrongTuan?: number[];
}): number {
  const dauThang = Date.UTC(input.nam, input.thang - 1, 1);
  const cuoiThang = Date.UTC(input.nam, input.thang, 0); // ngày 0 tháng sau = ngày cuối tháng này
  let so = 0;
  for (let t = dauThang; t <= cuoiThang; t += MOT_NGAY) {
    if (laNgayLamViec(t, input.ngayLamViecTrongTuan)) so += 1;
  }
  return so;
}

/**
 * Tháng này có được tính là một tháng làm việc không.
 *
 * `>=` chứ không `>`: NĐ 145 Đ66.2 nói "ít nhất 50%". Mẫu số 0 trả `false` chứ
 * không chia cho 0.
 */
export function datNguongThangLe(input: {
  congHopLe: number;
  soNgayLamViecChuan: number;
}): boolean {
  if (input.soNgayLamViecChuan <= 0) return false;
  return input.congHopLe >= NGUONG_THANG_LE * input.soNgayLamViecChuan;
}

/**
 * Phép của MỘT tháng.
 *
 * KHÔNG làm tròn ở đây. `lamTronLen05()` áp cho từng tháng biến mức 13 ngày
 * (13/12 = 1,083) thành 1,5 ngày mỗi tháng ⇒ 18 ngày/năm thay vì 13. Cộng số
 * thô vào quỹ, làm tròn ở tầng hiển thị và khi trừ phép.
 */
export function phepMotThang(mucCaNam: number): number {
  return mucCaNam / 12;
}

/**
 * Các tháng 'YYYY-MM' của `nam` mà NV làm được ≥ NGUONG_THANG_LE số ngày làm
 * việc bình thường của tháng đó, tính THEO LỊCH từ `ngayVaoLam`.
 *
 * Ngưỡng phải so trên SỐ NGÀY LÀM VIỆC THẬT của đúng tháng đó, không so trên
 * "ngày thứ mấy của tháng": tháng bắt đầu vào Chủ nhật và tháng bắt đầu vào
 * thứ Năm cho ra kết quả khác nhau ở cùng một ngày vào làm.
 *
 * Từ P3.10 đây là LUẬT CŨ, chỉ còn hai chỗ dùng: `tinhPhepDuocCap()` (cấp quỹ
 * lần đầu) và script `ops/backfill-thang-da-tich.ts`. Script phải trả về ĐÚNG
 * tập tháng mà lần cấp cũ đã tính — lệch một tháng là tháng đó được cấp lần
 * thứ hai khi bảng công của nó được chốt.
 */
export function thangTheoLich(input: {
  ngayVaoLam: string;
  nam: number;
  ngayLamViecTrongTuan?: number[];
}): string[] {
  const mocVao = moc(input.ngayVaoLam);
  const ds: string[] = [];

  for (let thang = 1; thang <= 12; thang += 1) {
    const dauThang = Date.UTC(input.nam, thang - 1, 1);
    const cuoiThang = Date.UTC(input.nam, thang, 0);
    if (mocVao > cuoiThang) continue;

    let ngayLamViecConLai = 0;
    for (let t = dauThang; t <= cuoiThang; t += MOT_NGAY) {
      if (!laNgayLamViec(t, input.ngayLamViecTrongTuan)) continue;
      if (t >= mocVao) ngayLamViecConLai += 1;
    }

    const dat = datNguongThangLe({
      congHopLe: ngayLamViecConLai,
      soNgayLamViecChuan: soNgayLamViecCuaThang({
        nam: input.nam,
        thang,
        ngayLamViecTrongTuan: input.ngayLamViecTrongTuan,
      }),
    });
    if (dat) ds.push(`${input.nam}-${String(thang).padStart(2, '0')}`);
  }

  return ds;
}

/**
 * Số tháng làm việc theo LỊCH của `nam`.
 *
 * Rút gọn thành `thangTheoLich().length` để hai đường không bao giờ trôi ra xa
 * nhau: nếu để hai bản đếm riêng, script backfill và luật cấp quỹ sẽ lệch, và
 * tháng lệch được cấp hai lần.
 */
export function demThangLamViec(input: {
  ngayVaoLam: string;
  nam: number;
  ngayLamViecTrongTuan?: number[];
}): number {
  return thangTheoLich(input).length;
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
