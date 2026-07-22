import { ApiError, apiErrorMessage } from '@/config/api';
import { maLoiChamCong, MA_LOI_THIET_BI } from '@/services/attendanceRecordService';

/**
 * Trạng thái màn hình chấm công. Tách khỏi component để test được bằng
 * bảng dữ liệu — đường hạnh phúc chỉ là 1 trong nhiều nhánh, và các nhánh
 * lỗi mới là thứ quyết định người dùng thấy hệ thống dễ hay khó chịu.
 *
 * Nguồn sự thật của các mã lỗi: be/apps/config-service/src/
 * thiet-bi-cham-cong/thiet-bi-cham-cong.service.ts (MA_LOI_THIET_BI) và
 * ban-ghi-cham-cong/ban-ghi-cham-cong.service.ts.
 *
 * CẢ 7 mã thiết bị đều trả HTTP 403 nên KHÔNG được phân biệt bằng status —
 * bắt buộc đọc `code`.
 */
export enum TrangThai {
  DANG_TAI = 'dang_tai',
  SAN_SANG = 'san_sang',
  CHUA_LIEN_KET = 'chua_lien_ket',
  THIET_BI_CHO_DUYET = 'thiet_bi_cho_duyet',
  THIET_BI_CHUA_DUOC_PHEP = 'thiet_bi_chua_duoc_phep',
  THIET_BI_BI_TU_CHOI = 'thiet_bi_bi_tu_choi',
  THIET_BI_BI_THU_HOI = 'thiet_bi_bi_thu_hoi',
  /** Request đi mà không kèm định danh máy — không có yêu cầu nào tới HR. */
  THIET_BI_THIEU_DINH_DANH = 'thiet_bi_thieu_dinh_danh',
  /** Dữ liệu thiết bị tự mâu thuẫn (>1 máy đã duyệt). HR phải dọn. */
  THIET_BI_DU_LIEU_BAT_NHAT = 'thiet_bi_du_lieu_bat_nhat',
  /** Trạng thái máy nằm ngoài 4 giá trị hợp lệ (dữ liệu import/migration). */
  THIET_BI_TRANG_THAI_KHONG_HOP_LE = 'thiet_bi_trang_thai_khong_hop_le',
  /**
   * 403 KHÔNG kèm mã thiết bị: hôm nay là nhân viên đã nghỉ việc
   * (`chanNeuDaNghiViec` ném ForbiddenException chuỗi thuần), ngày mai có
   * thể là một luật nghiệp vụ khác. FE không đoán lý do — hiện nguyên văn
   * câu backend gửi, vì backend là bên duy nhất biết vì sao.
   */
  BI_CHAN = 'bi_chan',
  TU_CHOI_VI_TRI = 'tu_choi_vi_tri',
  LOI_VI_TRI = 'loi_vi_tri',
  SAI_THU_TU = 'sai_thu_tu',
  LOI_KHAC = 'loi_khac',
}

function layStatus(err: unknown): number | undefined {
  if (err instanceof ApiError && err.statusCode) return err.statusCode;
  const goc = err instanceof ApiError ? (err.originalError as unknown) : err;
  return (goc as { response?: { status?: number } })?.response?.status;
}

/** Bảng tra 1-1 giữa mã lỗi backend và trạng thái màn hình. */
const THEO_MA_THIET_BI: Record<string, TrangThai> = {
  [MA_LOI_THIET_BI.CHO_DUYET]: TrangThai.THIET_BI_CHO_DUYET,
  [MA_LOI_THIET_BI.CHUA_DUOC_PHEP]: TrangThai.THIET_BI_CHUA_DUOC_PHEP,
  [MA_LOI_THIET_BI.BI_TU_CHOI]: TrangThai.THIET_BI_BI_TU_CHOI,
  [MA_LOI_THIET_BI.BI_THU_HOI]: TrangThai.THIET_BI_BI_THU_HOI,
  [MA_LOI_THIET_BI.THIEU_DINH_DANH]: TrangThai.THIET_BI_THIEU_DINH_DANH,
  [MA_LOI_THIET_BI.DU_LIEU_BAT_NHAT]: TrangThai.THIET_BI_DU_LIEU_BAT_NHAT,
  [MA_LOI_THIET_BI.TRANG_THAI_KHONG_HOP_LE]:
    TrangThai.THIET_BI_TRANG_THAI_KHONG_HOP_LE,
};

export function phanLoaiLoi(err: unknown): TrangThai {
  const status = layStatus(err);

  if (status === 404) return TrangThai.CHUA_LIEN_KET;
  if (status === 409) return TrangThai.SAI_THU_TU;

  if (status === 403) {
    const ma = maLoiChamCong(err);
    // Không rơi về LOI_KHAC ("Vui lòng thử lại"): 403 luôn là quyết định có
    // chủ đích của backend, thử lại sẽ luôn hỏng y hệt. BI_CHAN hiện đúng
    // câu backend nói, kèm hướng liên hệ HR.
    return (ma && THEO_MA_THIET_BI[ma]) || TrangThai.BI_CHAN;
  }

  return TrangThai.LOI_KHAC;
}

/**
 * Trạng thái chặn hẳn việc chấm công: KHÔNG hiện nút chấm, chỉ hiện lối ra.
 * Các lỗi tạm thời (vị trí, mạng, sai thứ tự) cố ý KHÔNG nằm ở đây — người
 * dùng phải còn nút để thử lại ngay.
 */
export const CHAN_CHAM_CONG: ReadonlySet<TrangThai> = new Set<TrangThai>([
  TrangThai.CHUA_LIEN_KET,
  TrangThai.THIET_BI_CHO_DUYET,
  TrangThai.THIET_BI_CHUA_DUOC_PHEP,
  TrangThai.THIET_BI_BI_TU_CHOI,
  TrangThai.THIET_BI_BI_THU_HOI,
  TrangThai.THIET_BI_THIEU_DINH_DANH,
  TrangThai.THIET_BI_DU_LIEU_BAT_NHAT,
  TrangThai.THIET_BI_TRANG_THAI_KHONG_HOP_LE,
  TrangThai.BI_CHAN,
]);

/**
 * Trạng thái mà FE không tự biết lý do → phải hiện nguyên văn câu backend.
 * Các trạng thái còn lại dùng câu của FE vì FE viết được câu trấn an và nói
 * rõ việc cần làm hơn (backend chỉ có một câu chung cho mọi ngữ cảnh).
 */
const UU_TIEN_CAU_BACKEND: ReadonlySet<TrangThai> = new Set<TrangThai>([
  TrangThai.BI_CHAN,
  TrangThai.SAI_THU_TU,
]);

export const THONG_DIEP: Record<TrangThai, string> = {
  [TrangThai.DANG_TAI]: 'Đang tải…',
  [TrangThai.SAN_SANG]: '',
  [TrangThai.CHUA_LIEN_KET]:
    'Tài khoản chưa được gắn với hồ sơ nhân viên. Liên hệ HR để được gán.',
  [TrangThai.THIET_BI_CHO_DUYET]:
    'Thiết bị của bạn đang chờ HR duyệt. Bạn sẽ chấm công được ngay sau khi HR kích hoạt.',
  [TrangThai.THIET_BI_CHUA_DUOC_PHEP]:
    'Thiết bị này chưa được phép chấm công. Yêu cầu đã được gửi tới HR.',
  [TrangThai.THIET_BI_BI_TU_CHOI]:
    'Thiết bị này đã bị HR từ chối. Liên hệ HR nếu cần dùng lại.',
  [TrangThai.THIET_BI_BI_THU_HOI]:
    'Thiết bị này đã bị thu hồi. Liên hệ HR nếu cần dùng lại.',
  [TrangThai.THIET_BI_THIEU_DINH_DANH]:
    'Máy này chưa tạo được định danh thiết bị nên chưa gửi yêu cầu nào tới HR. ' +
    'Hãy tắt chế độ duyệt web riêng tư, cho phép trình duyệt lưu dữ liệu rồi tải lại trang. ' +
    'Nếu vẫn không được, liên hệ HR.',
  [TrangThai.THIET_BI_DU_LIEU_BAT_NHAT]:
    'Hồ sơ của bạn đang gắn nhiều hơn một thiết bị được duyệt nên hệ thống tạm khoá chấm công. ' +
    'Đây là lỗi dữ liệu, không phải lỗi của bạn — liên hệ HR để gỡ bớt thiết bị cũ.',
  [TrangThai.THIET_BI_TRANG_THAI_KHONG_HOP_LE]:
    'Đăng ký thiết bị của bạn đang ở trạng thái không hợp lệ. ' +
    'Liên hệ HR để kiểm tra lại đăng ký thiết bị; bấm lại cũng không đổi được.',
  [TrangThai.BI_CHAN]:
    'Hiện chưa thể chấm công trên tài khoản này. Liên hệ HR để được hỗ trợ.',
  [TrangThai.TU_CHOI_VI_TRI]:
    'Trình duyệt chưa được cấp quyền vị trí. Vào Cài đặt → Quyền → Vị trí để bật, rồi thử lại.',
  [TrangThai.LOI_VI_TRI]:
    'Không lấy được vị trí. Kiểm tra GPS đã bật chưa rồi thử lại.',
  [TrangThai.SAI_THU_TU]: '',
  [TrangThai.LOI_KHAC]: 'Có lỗi xảy ra. Vui lòng thử lại.',
};

/**
 * Câu hiển thị cuối cùng cho một trạng thái. Không bao giờ trả chuỗi rỗng
 * cho trạng thái cần nói gì đó — màn hình câm là màn hình người dùng bấm lại
 * vô hạn.
 *
 * Câu backend dùng chung `apiErrorMessage()` (fe/src/config/api.ts) — kể từ
 * khi `ServiceBase.handleError()` đọc đúng `data.error.message` của
 * GlobalExceptionFilter, `ApiError.message` đã là câu tiếng Việt thật, không
 * cần tự bóc lại `originalError` ở đây nữa.
 */
export function thongDiepChoTrangThai(tt: TrangThai, err?: unknown): string {
  const cuaBackend = apiErrorMessage(err, '');
  if (UU_TIEN_CAU_BACKEND.has(tt) && cuaBackend) return cuaBackend;
  return THONG_DIEP[tt] || cuaBackend || THONG_DIEP[TrangThai.LOI_KHAC];
}

/**
 * Trạng thái nào thì hiện ô đặt tên máy + nút gửi HR duyệt.
 *
 * CHỈ hai trạng thái này: backend đã tự tạo dòng `cho_duyet` khi thấy máy lạ
 * (xem kiemTraThietBi), nên đây là lúc duy nhất việc đặt tên còn ý nghĩa.
 * `tu_choi`/`thu_hoi` thì bấm lại chỉ nhận đúng lỗi cũ — đưa nút vào là mời
 * người dùng bấm vô ích.
 */
export function choPhepGuiHrDuyet(tt: TrangThai): boolean {
  return (
    tt === TrangThai.THIET_BI_CHUA_DUOC_PHEP ||
    tt === TrangThai.THIET_BI_CHO_DUYET
  );
}
