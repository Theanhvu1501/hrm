/**
 * Suy ký hiệu bảng công cho MỘT ngày của MỘT người — hàm thuần, không DB,
 * không NestJS. Toàn bộ luật nghiệp vụ của P3.9 nằm ở đây, nên nó phải đúng
 * ngay từ tầng này: sai một ký hiệu là sai một ngày công trên phiếu lương.
 *
 * Dùng so sánh chuỗi "YYYY-MM-DD" cho mọi phép so ngày (đúng thứ tự thời
 * gian), và `Date.UTC` + `getUTCDay()` khi cần thứ trong tuần — không
 * `new Date(chuoi).getDay()`, vì cách đó đọc theo múi giờ tiến trình và máy
 * chủ đặt ở UTC-5 sẽ lệch một ngày. Cùng lý do đã ghi ở `luat-don.ts`.
 */

export const MA_CANH_BAO = {
  /** Chỉ có một lượt bấm trong ngày — gần như luôn là quên bấm lúc về. */
  THIEU_GIO_RA: 'thieu_gio_ra',
  /** Vừa có đơn nghỉ đã duyệt vừa có chấm công — một trong hai sai. */
  DON_VA_CHAM_CONG: 'don_va_cham_cong',
  /** Có ít nhất một lượt bấm ngoài bán kính địa điểm. */
  NGOAI_VUNG: 'ngoai_vung',
  /** Ngày làm việc nhưng không có căn cứ nào để điền. */
  CHUA_XU_LY: 'chua_xu_ly',
} as const;

export interface DonNghiCuaNgay {
  loaiDon: string; // 'nghi_phep' | 'nghi_bu'
  loaiNghi?: string; // chỉ có nghĩa với loaiDon = 'nghi_phep'
  laNuaNgay: boolean;
}

export interface SuyKyHieuInput {
  ngay: string; // "YYYY-MM-DD"
  ngayVaoLam?: string;
  ngayLamViecCuoi?: string; // từ hồ sơ Thôi việc đã duyệt
  ngayLamViecTrongTuan?: number[]; // 0=CN … 6=T7
  laNgayLe: boolean;
  donNghi?: DonNghiCuaNgay | null;
  coChamVao: boolean;
  coChamRa: boolean;
  coBanGhiNgoaiVung: boolean;
}

export interface SuyKyHieuKetQua {
  kyHieu: string | null; // null = ô trống
  canhBao: string[];
  chuaXuLy: boolean; // có đếm vào soOTrong không
}

/**
 * Thai sản / cưới hỏi / tang đều là nghỉ HƯỞNG LƯƠNG nên tính 1 công như P.
 * Không thêm ký hiệu riêng cho từng loại: bảng công chỉ cần biết ngày đó mấy
 * công, còn lý do cụ thể đã nằm ở đơn. Thêm ký hiệu chỉ để phân loại sẽ làm
 * lưới rối mà không đổi một đồng lương nào.
 */
const KY_HIEU_THEO_LOAI_NGHI: Record<string, string> = {
  phep_nam: 'P',
  khong_luong: 'KL',
  om_dau: 'O',
  thai_san: 'P',
  cuoi_hoi: 'P',
  tang: 'P',
};

/** 0=CN … 6=T7 của "YYYY-MM-DD", đọc trên trục UTC thuần. */
function thuTrongTuan(ngay: string): number {
  const [nam, thang, ngayTrongThang] = ngay.split('-').map(Number);
  return new Date(Date.UTC(nam, thang - 1, ngayTrongThang)).getUTCDay();
}

/** Lịch rỗng/undefined = CHƯA CẤU HÌNH ⇒ mọi ngày đều là ngày làm việc. */
function laNgayLamViec(ngay: string, lich?: number[]): boolean {
  if (!lich || lich.length === 0) return true;
  return lich.includes(thuTrongTuan(ngay));
}

function kyHieuCuaDon(don: DonNghiCuaNgay): string {
  if (don.laNuaNgay) return '1/2';
  if (don.loaiDon === 'nghi_bu') return 'NB';
  // Loại nghỉ lạ (thêm sau này mà quên cập nhật bảng) rơi về P — nghỉ hưởng
  // lương. Trả về null ở đây sẽ biến một ngày đã có đơn duyệt thành "ô chưa
  // xử lý", tức là bắt HR xử lý lại đúng thứ vừa duyệt xong.
  return KY_HIEU_THEO_LOAI_NGHI[don.loaiNghi ?? ''] ?? 'P';
}

/**
 * Ngày không thuộc phạm vi tính công. Trả object MỚI mỗi lần chứ không dùng
 * chung một hằng: `canhBao` là mảng mutable, mà nơi gọi lặp hàm này 31 lần cho
 * mỗi nhân viên rồi hậu xử lý kết quả — chỉ cần một chỗ `push` vào là mảng
 * dùng chung bị bẩn cho mọi ngày của mọi người từng đi qua đây.
 */
function khongTinh(): SuyKyHieuKetQua {
  return { kyHieu: null, canhBao: [], chuaXuLy: false };
}

export function suyKyHieuNgay(input: SuyKyHieuInput): SuyKyHieuKetQua {
  // Dòng 1: ngoài khoảng làm việc. Không cảnh báo gì — người chưa vào làm
  // hoặc đã nghỉ việc thì ô trống là đúng, không phải việc HR phải xử lý.
  if (input.ngayVaoLam && input.ngay < input.ngayVaoLam) return khongTinh();
  if (input.ngayLamViecCuoi && input.ngay > input.ngayLamViecCuoi) return khongTinh();

  // Dòng 2: ngoài lịch làm việc trong tuần. Đi làm Chủ nhật vẫn để trống —
  // giờ hôm đó đi vào cột làm thêm với hệ số 2.0, không phải một ngày công.
  if (!laNgayLamViec(input.ngay, input.ngayLamViecTrongTuan)) return khongTinh();

  const canhBao: string[] = [];
  if (input.coBanGhiNgoaiVung) canhBao.push(MA_CANH_BAO.NGOAI_VUNG);

  // Dòng 3: ngày lễ thắng tất cả. L là 1 công hưởng lương theo luật; nếu ai
  // đó đi làm hôm đó thì giờ làm nằm ở cột làm thêm hệ số 3.0. Tính thành X
  // là ăn mất đúng 1 công nghỉ lễ mà luật cho họ.
  if (input.laNgayLe) {
    return { kyHieu: 'L', canhBao, chuaXuLy: false };
  }

  // Dòng 4: đơn đã duyệt thắng chấm công — đơn đã qua một người duyệt nên
  // đáng tin hơn một lượt bấm.
  if (input.donNghi) {
    if (input.coChamVao) canhBao.push(MA_CANH_BAO.DON_VA_CHAM_CONG);
    return { kyHieu: kyHieuCuaDon(input.donNghi), canhBao, chuaXuLy: false };
  }

  // Dòng 5: có mặt là có công.
  if (input.coChamVao) {
    if (!input.coChamRa) canhBao.push(MA_CANH_BAO.THIEU_GIO_RA);
    return { kyHieu: 'X', canhBao, chuaXuLy: false };
  }

  // Dòng 6: không đủ căn cứ. Máy KHÔNG đoán — để trống và bắt HR quyết.
  canhBao.push(MA_CANH_BAO.CHUA_XU_LY);
  return { kyHieu: null, canhBao, chuaXuLy: true };
}
