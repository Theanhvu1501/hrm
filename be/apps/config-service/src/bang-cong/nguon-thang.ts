import type { AttendanceRecord, AttendanceRequest, Holiday } from '@app/entities';
import type { DonNghiCuaNgay } from './suy-ky-hieu';
import { tinhSoGioOt } from '../don-cham-cong/luat-don';

/**
 * Gom dữ liệu nguồn của CẢ THÁNG thành các Map tra cứu O(1).
 *
 * Vì sao cần lớp này: `generate()` cũ chạy một truy vấn cho mỗi nhân viên,
 * cộng một truy vấn nữa để cộng giờ OT. Thêm chấm công và đơn từ theo kiểu đó
 * thì 200 nhân viên × 31 ngày là hàng nghìn truy vấn cho một lần bấm nút.
 * Ở đây service lấy dữ liệu một lần rồi gom trong bộ nhớ.
 *
 * Toàn bộ hàm trong file này là hàm THUẦN — nhận mảng đã lấy sẵn, không tự
 * truy vấn. Nhờ vậy test được mà không dựng repo giả.
 */

const MOT_NGAY_MS = 24 * 60 * 60 * 1000;
const hai = (n: number) => String(n).padStart(2, '0');

function chuoiNgay(t: number): string {
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${hai(d.getUTCMonth() + 1)}-${hai(d.getUTCDate())}`;
}

function moc(ngay: string): number {
  const [nam, thang, ngayTrongThang] = ngay.split('-').map(Number);
  return Date.UTC(nam, thang - 1, ngayTrongThang);
}

/** `"2026-08"` → `['2026-08-01', … '2026-08-31']`. */
export function cacNgayTrongThang(thang: string): string[] {
  const [nam, thangSo] = thang.split('-').map(Number);
  // Ngày 0 của tháng sau = ngày cuối của tháng này; tự đúng cả năm nhuận.
  const soNgay = new Date(Date.UTC(nam, thangSo, 0)).getUTCDate();
  return Array.from({ length: soNgay }, (_, i) => `${thang}-${hai(i + 1)}`);
}

/** Trải các khoảng lễ đang bật ra từng ngày, chỉ giữ phần rơi vào `thang`. */
export function tapNgayLeCuaThang(holidays: Holiday[], thang: string): Set<string> {
  const tap = new Set<string>();

  for (const le of holidays) {
    if (le.isActive === false) continue;
    if (!le.tuNgay) continue;

    const den = le.denNgay || le.tuNgay;
    for (let t = moc(le.tuNgay); t <= moc(den); t += MOT_NGAY_MS) {
      const ngay = chuoiNgay(t);
      if (ngay.startsWith(thang)) tap.add(ngay);
    }
  }

  return tap;
}

export interface DuLieuNgay {
  coChamVao: boolean;
  coChamRa: boolean;
  coBanGhiNgoaiVung: boolean;
  donNghi: DonNghiCuaNgay | null;
  /** Ngày được phủ bởi đơn `lam_online` đã duyệt — xem `SuyKyHieuInput`. */
  coDonOnline: boolean;
}

function oTrong(): DuLieuNgay {
  return {
    coChamVao: false,
    coChamRa: false,
    coBanGhiNgoaiVung: false,
    donNghi: null,
    coDonOnline: false,
  };
}

function layO(
  map: Map<string, Map<string, DuLieuNgay>>,
  employeeId: string,
  ngay: string,
): DuLieuNgay {
  let theoNgay = map.get(employeeId);
  if (!theoNgay) {
    theoNgay = new Map();
    map.set(employeeId, theoNgay);
  }
  let o = theoNgay.get(ngay);
  if (!o) {
    o = oTrong();
    theoNgay.set(ngay, o);
  }
  return o;
}

const LOAI_DON_NGHI = new Set(['nghi_phep', 'nghi_bu']);

/**
 * Khoá ngoài `employeeId`, khoá trong `"YYYY-MM-DD"`.
 *
 * Chỉ nhận đơn `da_duyet` và còn `isActive`: đơn chờ duyệt chưa phải sự thật,
 * còn đơn đã huỷ thì không được để lại dấu vết trên bảng công.
 */
export function gomTheoNgay(
  records: AttendanceRecord[],
  requests: AttendanceRequest[],
  thang: string,
): Map<string, Map<string, DuLieuNgay>> {
  const map = new Map<string, Map<string, DuLieuNgay>>();

  for (const bg of records) {
    if (bg.isActive === false) continue;
    if (!bg.ngay?.startsWith(thang)) continue;

    const o = layO(map, bg.employeeId, bg.ngay);
    if (bg.loai === 'vao') o.coChamVao = true;
    if (bg.loai === 'ra') o.coChamRa = true;
    if (bg.ngoaiVung) o.coBanGhiNgoaiVung = true;
  }

  for (const don of requests) {
    if (don.isActive === false) continue;
    if (don.trangThai !== 'da_duyet') continue;

    // Đơn làm online: ngày LÀM, không phải ngày nghỉ ⇒ đổ vào cờ riêng chứ
    // không vào `donNghi`. Nửa buổi (`buoi`) CỐ Ý không đọc ở đây: nửa buổi
    // online vẫn ra `OL` = 1 công không ăn ca, y hệt online trọn ngày (chủ
    // sản phẩm chốt 2026-08-14) — buổi chỉ để hiển thị trên đơn.
    if (don.loaiDon === 'lam_online') {
      if (!don.ngay) continue;
      const denOnline = don.denNgay || don.ngay;
      for (let t = moc(don.ngay); t <= moc(denOnline); t += MOT_NGAY_MS) {
        const ngay = chuoiNgay(t);
        if (!ngay.startsWith(thang)) continue;
        layO(map, don.employeeId, ngay).coDonOnline = true;
      }
      continue;
    }

    if (!LOAI_DON_NGHI.has(don.loaiDon)) continue;
    // Nghỉ bù LẺ GIỜ không sinh ký hiệu: người đó vẫn đi làm hôm ấy, chỉ vắng
    // vài tiếng, và quỹ giờ làm thêm đã gánh phần vắng đó. Ngày vẫn ra `X` từ
    // chấm công. Thiếu `kieuNghi` = đơn cũ trước P4.2a ⇒ giữ hành vi theo ngày,
    // nếu không lần Tổng hợp đầu tiên sau deploy xoá trắng NB của mọi đơn cũ.
    if (don.loaiDon === 'nghi_bu' && don.kieuNghi === 'theo_gio') continue;
    if (!don.ngay) continue;

    const den = don.denNgay || don.ngay;
    // `buoi` chỉ có nghĩa khi đơn đúng MỘT ngày — cùng quy ước
    // tinhSoNgayNghi() của luat-don.ts, vì đơn nhiều ngày không rõ nửa ngày
    // áp cho ngày nào trong khoảng.
    const laNuaNgay =
      den === don.ngay && (don.buoi === 'sang' || don.buoi === 'chieu');

    for (let t = moc(don.ngay); t <= moc(den); t += MOT_NGAY_MS) {
      const ngay = chuoiNgay(t);
      if (!ngay.startsWith(thang)) continue;
      layO(map, don.employeeId, ngay).donNghi = {
        loaiDon: don.loaiDon,
        loaiNghi: don.loaiNghi,
        laNuaNgay,
      };
    }
  }

  return map;
}

/**
 * Số NGÀY đi muộn / về sớm theo nhân viên.
 *
 * Mỗi ngày công chỉ tính TỐI ĐA một lần muộn và một lần sớm, quyết định bởi
 * lượt VÀO ĐẦU TIÊN và lượt RA CUỐI CÙNG của ngày đó.
 *
 * Vì sao không đếm theo từng bản ghi như trước: người dùng bấm nhiều lần cho
 * chắc, và mỗi lượt bấm mang `soPhutDiMuon`/`soPhutVeSom` riêng của chính nó.
 * Đo trên production 2026-08-05 thấy hai ca thật:
 *
 *  - Bấm ra 16:58 → 16:59 → 17:00 (ca tan 17:00). Về ĐÚNG GIỜ, nhưng hai lượt
 *    đầu mang sớm 2p và 1p ⇒ cách cũ đếm thành 2 lần về sớm trong MỘT ngày.
 *  - Vào 08:00 rồi bấm lại 09:00; ra 15:00 rồi ra lại 22:00. Người ta đến
 *    đúng giờ và về muộn, nhưng cách cũ đếm 1 lần muộn + 1 lần sớm.
 *
 * Tức là việc bấm thừa bị biến thành vi phạm kỷ luật không có thật.
 *
 * `soPhutDiMuon`/`soPhutVeSom` trên từng bản ghi vẫn giữ nguyên — chúng là sự
 * thật về CHÍNH lượt bấm đó và màn Bản ghi chấm công cần chúng để đối chiếu.
 * Sai sót nằm ở cách GOM, nên chỉ sửa ở đây.
 */
export function demMuonSom(
  records: AttendanceRecord[],
): Map<string, { diMuon: number; veSom: number }> {
  const map = new Map<string, { diMuon: number; veSom: number }>();
  // Khoá: `employeeId|ngay`. Gom theo NGÀY CÔNG (`bg.ngay`) chứ không theo
  // ngày lịch của `thoiDiem`: ca qua đêm cho lượt ra thừa hưởng `ngay` của
  // lượt vào đang mở, nên hai nửa một phiên phải nằm chung một nhóm.
  const theoNgay = new Map<string, AttendanceRecord[]>();

  for (const bg of records) {
    if (bg.isActive === false) continue;

    // Giữ nguyên hành vi cũ: mọi nhân viên xuất hiện trong dữ liệu đều có mặt
    // trong map, kể cả khi không vi phạm gì.
    if (!map.has(bg.employeeId)) map.set(bg.employeeId, { diMuon: 0, veSom: 0 });

    const khoa = `${bg.employeeId}|${bg.ngay}`;
    const nhom = theoNgay.get(khoa);
    if (nhom) nhom.push(bg);
    else theoNgay.set(khoa, [bg]);
  }

  for (const [khoa, nhom] of theoNgay) {
    const employeeId = khoa.slice(0, khoa.lastIndexOf('|'));
    const dem = map.get(employeeId)!;
    const xep = xepTheoThoiDiem(nhom);

    const vaoDau = xep.find((b) => b.loai === 'vao');
    if ((vaoDau?.soPhutDiMuon ?? 0) > 0) dem.diMuon += 1;

    const raCuoi = [...xep].reverse().find((b) => b.loai === 'ra');
    if ((raCuoi?.soPhutVeSom ?? 0) > 0) dem.veSom += 1;
  }

  return map;
}

/**
 * Xếp các lượt bấm của MỘT ngày công theo thời gian.
 *
 * Chỉ xếp khi MỌI bản ghi trong nhóm đều có `thoiDiem` đọc được. Thiếu dù một
 * cái (dữ liệu cũ, hoặc HR nhập bù) thì giữ nguyên thứ tự mảng — đó là thứ tự
 * truy vấn trả về, thường đã đúng thời gian. Trộn "có mốc" với "không mốc"
 * bằng cách gán 0 cho cái thiếu sẽ đẩy nó lên đầu và biến nó thành "lượt vào
 * đầu tiên" một cách tuỳ tiện.
 */
function xepTheoThoiDiem(nhom: AttendanceRecord[]): AttendanceRecord[] {
  const moc = nhom.map((b) => (b.thoiDiem ? Date.parse(b.thoiDiem) : NaN));
  if (moc.some((t) => Number.isNaN(t))) return nhom;

  return nhom
    .map((b, i) => ({ b, t: moc[i] }))
    .sort((x, y) => x.t - y.t)
    .map(({ b }) => b);
}

/** Tổng giờ OT đã duyệt trong tháng, theo nhân viên. */
export function tongGioOt(
  requests: AttendanceRequest[],
  thang: string,
): Map<string, number> {
  const map = new Map<string, number>();

  for (const don of requests) {
    if (don.isActive === false) continue;
    if (don.trangThai !== 'da_duyet') continue;
    if (don.loaiDon !== 'lam_them_gio') continue;
    if (!don.ngay?.startsWith(thang)) continue;

    // Ưu tiên số đã CHỐT trên đơn lúc tạo (P3.6 snapshot `soGioOt`) — cùng
    // nguyên tắc "chốt lúc tạo, không tính lại khi đọc" của module đơn từ.
    // Chỉ tính lại cho đơn cũ tạo trước P3.6 chưa có trường đó, và khi tính
    // lại thì dùng CHUNG hàm với đơn từ chứ không chép thêm một bản: bản chép
    // trong bang-cong.service.ts đang kẹp ca qua đêm về 0 giờ.
    const gio =
      don.soGioOt ?? (don.gioTu && don.gioDen ? tinhSoGioOt(don.gioTu, don.gioDen) : 0);
    map.set(don.employeeId, (map.get(don.employeeId) ?? 0) + gio);
  }

  return map;
}
