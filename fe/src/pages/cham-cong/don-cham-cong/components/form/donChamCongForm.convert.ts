import {
  AttendanceRequest,
  CreateAttendanceRequestDto,
} from "@/services/attendanceRequestService";
import { TruongDon, hienTruong } from "../../truongTheoLoaiDon";
import { DonChamCongFormValues } from "./DonChamCongForm.state";

/**
 * Chuyển đổi giữa bản ghi đơn ↔ giá trị form ↔ payload gửi backend cho màn
 * HR `/cham-cong/don-tu`.
 *
 * Tách khỏi component vì đây là chỗ DUY NHẤT quyết định body của
 * `POST /don-cham-cong` và `PUT /don-cham-cong/:id`. Backend bật
 * `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`, nên thừa
 * MỘT khoá là cả cái đơn bị 400 — HR chỉ thấy "không tạo được đơn" mà không
 * biết vì sao. Hàm thuần thì test được từng loại đơn bằng bảng, không phải
 * dựng cả Modal antd lên mới biết payload đúng hay sai.
 */

export const GIA_TRI_MAC_DINH: DonChamCongFormValues = {
  employeeId: "",
  loaiDon: "giai_trinh",
  ngay: "",
  denNgay: "",
  buoi: "ca_ngay",
  loaiNghi: "",
  kieuNghi: "theo_ngay",
  lyDo: "",
  gioTu: "",
  gioDen: "",
  minhChung: "",
  ghiChu: "",
};

export function toFormValues(
  request: AttendanceRequest | null
): DonChamCongFormValues {
  if (!request) return { ...GIA_TRI_MAC_DINH };

  return {
    employeeId: request.employeeId || "",
    loaiDon: request.loaiDon || "giai_trinh",
    ngay: request.ngay || "",
    denNgay: request.denNgay || "",
    // Đơn không phải đơn nghỉ thì không có `buoi`; quay về mặc định "cả ngày"
    // thay vì để trống, vì Select buổi không có lựa chọn rỗng hợp lệ.
    buoi: request.buoi || "ca_ngay",
    loaiNghi: request.loaiNghi || "",
    // Đơn cũ (trước P4.2a) không có kieuNghi → mặc định "theo_ngay", đúng
    // hành vi trước khi trường này tồn tại (xem truongCuaDon()).
    kieuNghi: request.kieuNghi || "theo_ngay",
    lyDo: request.lyDo || "",
    gioTu: request.gioTu || "",
    gioDen: request.gioDen || "",
    minhChung: request.minhChung || "",
    ghiChu: request.ghiChu || "",
  };
}

/**
 * Dựng payload cho `attendanceRequestService.create()/update()`.
 *
 * Nguyên tắc giống hệt `dungDtoNopDon()` của màn nhân viên:
 *
 * 1. CHỈ đưa vào trường mà loại đơn này thật sự có (theo `hienTruong`). HR đổi
 *    loại đơn qua lại thì giá trị cũ vẫn nằm trong state react-hook-form —
 *    một đơn nghỉ phép mang theo `gioTu` của lần chọn "Làm thêm giờ" trước đó
 *    sẽ được backend lưu nguyên, rồi hiện lên bảng công như một khung giờ có
 *    thật.
 * 2. Bỏ HẲN khoá khi giá trị rỗng, không đặt `key: undefined`.
 * 3. KHÔNG gửi soNgayNghi/soGioOt/heSoOt/loaiNgayOt (backend tự tính, và các
 *    khoá này không có trong DTO → 400), cũng không gửi
 *    trangThai/nguoiDuyet (create() luôn tạo ở `cho_duyet`, update() bóc bỏ
 *    cả hai — trạng thái chỉ đi qua PATCH :id/trang-thai).
 */
export function dungDtoQuanTri(
  v: DonChamCongFormValues
): CreateAttendanceRequestDto {
  const co = (t: TruongDon) => hienTruong(v, t);

  const dto: CreateAttendanceRequestDto = {
    employeeId: v.employeeId,
    loaiDon: v.loaiDon,
    ngay: v.ngay,
  };

  // Đơn nghỉ luôn gửi denNgay để backend có khoảng rõ ràng; HR không chọn
  // ngày kết thúc thì khoảng là chính ngày bắt đầu.
  if (co("denNgay")) dto.denNgay = v.denNgay || v.ngay;
  if (co("buoi")) dto.buoi = v.buoi;
  if (co("loaiNghi") && v.loaiNghi) dto.loaiNghi = v.loaiNghi;
  if (co("gioTu") && v.gioTu) dto.gioTu = v.gioTu;
  if (co("gioDen") && v.gioDen) dto.gioDen = v.gioDen;
  // kieuNghi không nằm trong bảng TRUONG_THEO_LOAI (nó là thứ QUYẾT ĐỊNH
  // truongCuaDon() cho nghi_bu, không phải một trường bị nó chi phối) nên
  // gửi trực tiếp theo loaiDon, không qua co().
  if (v.loaiDon === "nghi_bu") dto.kieuNghi = v.kieuNghi;

  // lyDo/minhChung/ghiChu đi kèm mọi loại đơn — không nằm trong bảng
  // TRUONG_THEO_LOAI vì chúng không bao giờ bị ẩn.
  const lyDo = v.lyDo.trim();
  if (lyDo) dto.lyDo = lyDo;
  const minhChung = v.minhChung.trim();
  if (minhChung) dto.minhChung = minhChung;
  const ghiChu = v.ghiChu.trim();
  if (ghiChu) dto.ghiChu = ghiChu;

  return dto;
}
