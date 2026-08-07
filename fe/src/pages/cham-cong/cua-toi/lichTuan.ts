import {
  AttendanceRecord,
  LoaiNgay,
  NgayNghi,
} from '@/services/attendanceRecordService';

/**
 * Lịch tuần trên màn hình chấm công của nhân viên.
 *
 * Mọi phép tính ngày ở đây dựng mốc bằng `Date.UTC` chứ không
 * `new Date("YYYY-MM-DD")` rồi đọc `getDay()`: cách sau đọc theo múi giờ
 * của máy người xem, nên người ngồi ở UTC-5 sẽ thấy lịch lùi một ngày.
 */

export type MauCham = 'xanh' | 'do' | 'xam';

const MOT_NGAY_MS = 86_400_000;

function mocUtc(ngay: string): Date {
  const [nam, thang, ngayTrongThang] = ngay.split('-').map(Number);
  return new Date(Date.UTC(nam, thang - 1, ngayTrongThang));
}

function chuoiNgay(d: Date): string {
  const hai = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${hai(d.getUTCMonth() + 1)}-${hai(d.getUTCDate())}`;
}

/**
 * Thứ Hai của tuần chứa `ngay`.
 *
 * Tuần Việt Nam bắt đầu từ thứ Hai. `getUTCDay()` trả 0 cho Chủ Nhật, nên
 * Chủ Nhật phải lùi 6 ngày chứ không phải 0 — nếu không, Chủ Nhật sẽ tự mở
 * một tuần mới và lịch nhảy một ô mỗi cuối tuần.
 */
export function dauTuanCua(ngay: string): string {
  const d = mocUtc(ngay);
  const thu = d.getUTCDay();
  const lui = thu === 0 ? 6 : thu - 1;
  return chuoiNgay(new Date(d.getTime() - lui * MOT_NGAY_MS));
}

export function dichTuan(dauTuan: string, soTuan: number): string {
  return chuoiNgay(new Date(mocUtc(dauTuan).getTime() + soTuan * 7 * MOT_NGAY_MS));
}

export function bayNgayTu(dauTuan: string): string[] {
  const goc = mocUtc(dauTuan).getTime();
  return Array.from({ length: 7 }, (_, i) =>
    chuoiNgay(new Date(goc + i * MOT_NGAY_MS))
  );
}

export function gomTheoNgay(
  ds: AttendanceRecord[]
): Record<string, AttendanceRecord[]> {
  const kq: Record<string, AttendanceRecord[]> = {};
  for (const b of ds) {
    (kq[b.ngay] ??= []).push(b);
  }
  return kq;
}

/**
 * Màu chấm của một ngày, CHỈ đọc bản ghi.
 *
 * Cố ý không hỏi "ngày đó có phải ngày làm việc không": màn hình không biết
 * điều đó. /hom-nay chỉ trả ca của HÔM NAY; lịch nghỉ hằng tuần, ngày lễ và
 * đơn nghỉ phép nằm ở ba nguồn khác. Suy đoán bằng ca hiện tại sẽ bôi đỏ
 * Chủ Nhật và ngày lễ của cả công ty — sai to hơn nhiều so với để chúng xám.
 *
 * Hệ quả đã cân nhắc: ngày nghỉ, ngày lễ và ngày QUÊN CHẤM HOÀN TOÀN đều
 * xám như nhau. Xám nghĩa là "không có gì để nói". Muốn tách riêng ngày
 * quên chấm thì phải có lịch làm việc theo ngày — để đợt sau.
 */
export function mauChamNgay(banGhiCuaNgay?: AttendanceRecord[]): MauCham {
  if (!banGhiCuaNgay || banGhiCuaNgay.length === 0) return 'xam';
  const coVao = banGhiCuaNgay.some((b) => b.loai === 'vao');
  const coRa = banGhiCuaNgay.some((b) => b.loai === 'ra');
  return coVao && coRa ? 'xanh' : 'do';
}

/** Ký hiệu ô lịch — cùng chữ với bảng công để hai màn hình nói một ngôn ngữ. */
export type KyHieuNgay = 'N' | 'L' | null;

export interface OLichNgay {
  mau: MauCham;
  kyHieu: KyHieuNgay;
}

/**
 * Ô một ngày trên lịch tuần, đọc CẢ bản ghi lẫn loại ngày do backend cấp.
 *
 * Đây là thứ mà chú thích trên `mauChamNgay` hẹn "để đợt sau": trước đây màn
 * hình không biết ngày nào là ngày làm việc, nên ngày nghỉ, ngày lễ và ngày
 * QUÊN CHẤM đều xám như nhau. Có `loaiNgay` từ `/cua-toi/ngay-nghi` thì xám
 * thu hẹp đúng về nghĩa "ngày làm việc mà không có bản ghi nào".
 *
 * Ngày nghỉ hiện XANH chứ không phải màu thứ tư: màu xanh trả lời câu "ngày
 * này còn việc gì phải làm không?" — ngày nghỉ câu trả lời là không, y hệt
 * ngày đã chấm đủ. Thêm màu thứ tư là bắt người xem dừng lại giải mã.
 *
 * Bản ghi THẮNG loại ngày: đi làm thứ Bảy thì ô hiện theo lượt chấm thật,
 * không bị chữ N đè lên — công sức đó không được biến mất khỏi lịch.
 */
export function oLichNgay(
  banGhiCuaNgay: AttendanceRecord[] | undefined,
  loaiNgay: LoaiNgay | undefined
): OLichNgay {
  if (banGhiCuaNgay && banGhiCuaNgay.length > 0) {
    return { mau: mauChamNgay(banGhiCuaNgay), kyHieu: null };
  }
  if (loaiNgay === 'nghi') return { mau: 'xanh', kyHieu: 'N' };
  if (loaiNgay === 'le') return { mau: 'xanh', kyHieu: 'L' };
  return { mau: 'xam', kyHieu: null };
}

/**
 * Dựng map `ngay -> loai` từ danh sách backend trả về. Danh sách rỗng (lỗi
 * mạng, hoặc tenant chưa cấu hình lịch tuần) cho map rỗng, và lịch tự rơi về
 * đúng hành vi cũ — không có ngày nào bị đánh dấu nhầm là nghỉ.
 */
export function trangThaiTheoNgay(
  ds: NgayNghi[]
): Record<string, LoaiNgay | undefined> {
  const kq: Record<string, LoaiNgay | undefined> = {};
  for (const n of ds) kq[n.ngay] = n.loai;
  return kq;
}

/** "Tuần 20–26/07", hoặc "Tuần 27/07–02/08" khi tuần bắc qua hai tháng. */
export function nhanTuan(dauTuan: string): string {
  const [, thangDau, ngayDau] = dauTuan.split('-');
  const [, thangCuoi, ngayCuoi] = bayNgayTu(dauTuan)[6].split('-');

  return thangDau === thangCuoi
    ? `Tuần ${ngayDau}–${ngayCuoi}/${thangDau}`
    : `Tuần ${ngayDau}/${thangDau}–${ngayCuoi}/${thangCuoi}`;
}
