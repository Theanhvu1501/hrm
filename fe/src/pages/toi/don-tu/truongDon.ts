import {
  AttendanceRequestType,
  Buoi,
  LoaiNghi,
  TaoDonCuaToiDto,
} from "@/services/attendanceRequestService";

/**
 * Luật "form đổi trường theo loại đơn" của màn nhân viên `/toi/don-tu`.
 *
 * Tách khỏi component vì hai lý do:
 *
 * 1. Đây là chỗ DUY NHẤT quyết định payload gửi lên `POST /don-cham-cong/cua-toi`.
 *    Backend bật `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`
 *    trên `TaoDonCuaToiDto` (10 trường, KHÔNG có employeeId/trangThai/nguoiDuyet),
 *    nên thừa MỘT khoá là cả cái đơn bị 400 — người dùng chỉ thấy "nộp đơn hỏng"
 *    mà không hiểu vì sao. Một hàm thuần thì test được từng loại đơn bằng bảng.
 *
 * 2. Backend `DonChamCong_Service.tinhCacTruongSnapshot()` gọi
 *    `tinhSoGioOt(dto.gioTu!, dto.gioDen!)` cho đơn `lam_them_gio` — dấu `!`
 *    nghĩa là thiếu giờ thì nổ ở backend chứ không trả lỗi tử tế. FE phải chặn
 *    trước, ở `kiemTraDon()`.
 */
export type TruongDon =
  | "ngay"
  | "denNgay"
  | "buoi"
  | "loaiNghi"
  | "lyDo"
  | "gioTu"
  | "gioDen";

/**
 * Bảng §7 của docs/superpowers/specs/2026-07-24-hrm-p3.6-don-tu-design.md.
 *
 * `buoi` có mặt ở đây cho nghi_phep/nghi_bu nhưng CHỈ hiện khi đơn đúng một
 * ngày — xem `hienBuoi()`. Nửa buổi của một khoảng 3 ngày là vô nghĩa, và
 * `tinhSoNgayNghi()` ở backend cũng chỉ đọc `buoi` khi tuNgay === denNgay.
 */
const TRUONG_THEO_LOAI: Record<AttendanceRequestType, readonly TruongDon[]> = {
  giai_trinh: ["ngay", "gioTu", "gioDen", "lyDo"],
  lam_them_gio: ["ngay", "gioTu", "gioDen", "lyDo"],
  nghi_phep: ["ngay", "denNgay", "buoi", "loaiNghi", "lyDo"],
  nghi_bu: ["ngay", "denNgay", "buoi", "lyDo"],
};

export interface GiaTriFormDon {
  loaiDon: AttendanceRequestType;
  ngay: string;
  denNgay: string;
  buoi: Buoi;
  /** "" = chưa chọn — Select rỗng, không phải một loại nghỉ hợp lệ nào. */
  loaiNghi: LoaiNghi | "";
  lyDo: string;
  gioTu: string;
  gioDen: string;
}

export const GIA_TRI_MAC_DINH: GiaTriFormDon = {
  loaiDon: "giai_trinh",
  ngay: "",
  denNgay: "",
  buoi: "ca_ngay",
  loaiNghi: "",
  lyDo: "",
  gioTu: "",
  gioDen: "",
};

/** Đơn nghỉ đúng MỘT ngày mới có khái niệm nửa buổi. */
export function hienBuoi(v: GiaTriFormDon): boolean {
  if (v.loaiDon !== "nghi_phep" && v.loaiDon !== "nghi_bu") return false;
  // denNgay rỗng nghĩa là người dùng chưa chọn ngày kết thúc → coi như đúng
  // một ngày (đó cũng là cách `dungDtoNopDon` gửi lên: denNgay = ngay).
  return !v.denNgay || v.denNgay === v.ngay;
}

/** Trường nào được vẽ ra cho loại đơn đang chọn. */
export function hienTruong(v: GiaTriFormDon, truong: TruongDon): boolean {
  if (!TRUONG_THEO_LOAI[v.loaiDon].includes(truong)) return false;
  if (truong === "buoi") return hienBuoi(v);
  return true;
}

const NHAN_TRUONG: Record<TruongDon, string> = {
  ngay: "Ngày",
  denNgay: "Đến ngày",
  buoi: "Buổi",
  loaiNghi: "Loại nghỉ",
  lyDo: "Lý do",
  gioTu: "Từ giờ",
  gioDen: "Đến giờ",
};

/**
 * Kiểm tra trước khi gửi. Trả về câu tiếng Việt để hiện thẳng lên màn hình,
 * hoặc `null` khi hợp lệ.
 *
 * Cố ý trả MỘT câu chứ không phải map lỗi từng ô: form này ngắn (nhiều nhất 5
 * ô) và hiện trên điện thoại, một dòng đỏ ngay trên nút gửi đọc nhanh hơn là
 * đi tìm ô nào đang đỏ.
 */
export function kiemTraDon(v: GiaTriFormDon): string | null {
  if (!v.ngay) return `${NHAN_TRUONG.ngay} không được để trống`;

  // lam_them_gio: backend dùng `dto.gioTu!` / `dto.gioDen!` để tính số giờ OT.
  // Thiếu là backend ném TypeError chứ không phải 400 có thông điệp.
  if (v.loaiDon === "lam_them_gio" && (!v.gioTu || !v.gioDen)) {
    return "Đơn làm thêm giờ phải có giờ bắt đầu và giờ kết thúc";
  }

  if (v.loaiDon === "nghi_phep" && !v.loaiNghi) {
    return "Vui lòng chọn loại nghỉ";
  }

  // So sánh chuỗi "YYYY-MM-DD" là so sánh đúng thứ tự thời gian, không cần
  // dựng Date (và không dính múi giờ máy người dùng).
  if (v.denNgay && v.denNgay < v.ngay) {
    return "Đến ngày phải bằng hoặc sau ngày bắt đầu";
  }

  if (!v.lyDo.trim()) return "Vui lòng nhập lý do";

  return null;
}

/**
 * Dựng đúng payload cho `attendanceRequestService.taoDonCuaToi()`.
 *
 * Nguyên tắc: CHỈ đưa vào những trường mà loại đơn này thật sự có (theo
 * `TRUONG_THEO_LOAI`), và bỏ hẳn khoá khi giá trị rỗng. Không đặt
 * `key: undefined`: `JSON.stringify` bỏ qua chúng nên vẫn an toàn với
 * `forbidNonWhitelisted`, nhưng object trả về sẽ khó đọc trong test và trong
 * log — và một ngày nào đó ai đó đổi sang gửi bằng FormData thì `undefined`
 * hoá thành chuỗi "undefined" gửi lên thật.
 */
export function dungDtoNopDon(v: GiaTriFormDon): TaoDonCuaToiDto {
  const co = (t: TruongDon) => hienTruong(v, t);
  const dto: TaoDonCuaToiDto = { loaiDon: v.loaiDon, ngay: v.ngay };

  // Đơn nghỉ luôn gửi denNgay để backend có khoảng rõ ràng; người dùng không
  // chọn thì khoảng là chính ngày bắt đầu.
  if (co("denNgay")) dto.denNgay = v.denNgay || v.ngay;
  if (co("buoi")) dto.buoi = v.buoi;
  if (co("loaiNghi") && v.loaiNghi) dto.loaiNghi = v.loaiNghi;
  if (co("gioTu") && v.gioTu) dto.gioTu = v.gioTu;
  if (co("gioDen") && v.gioDen) dto.gioDen = v.gioDen;

  const lyDo = v.lyDo.trim();
  if (lyDo) dto.lyDo = lyDo;

  return dto;
}
