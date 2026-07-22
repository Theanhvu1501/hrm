/**
 * Chuyển đổi thuần giữa giá trị form `NhapBuForm.tsx` và
 * `HrNhapChamCongDto` gửi BE, cùng logic chặn thời điểm ở tương lai.
 * Tách riêng khỏi component để có thể unit test không cần render React.
 *
 * `POST /hr-nhap` (be/apps/config-service/src/ban-ghi-cham-cong/ban-ghi-cham-cong.service.ts)
 * chặn cứng thời điểm ở tương lai và ném BadRequestException. Chặn sớm ở FE
 * bằng cách disable ngày/giờ tương lai trên DatePicker/TimePicker để người
 * dùng biết trước, thay vì điền xong cả form rồi mới bị BE từ chối.
 */
import type { Dayjs } from "dayjs";
import { HrNhapChamCongDto } from "@/services/attendanceRecordService";
import { DINH_DANG_NGAY, homNayVN, gioVN } from "@/ultils/thoiGianVN";

export interface NhapBuFormValues {
  employeeId: string;
  ngay: string | null; // "YYYY-MM-DD" theo giờ VN
  loai: "vao" | "ra";
  gio: string | null; // "HH:mm"
  ghiChu?: string;
}

export const NHAP_BU_FORM_DEFAULT_VALUES: NhapBuFormValues = {
  employeeId: "",
  ngay: null,
  loai: "vao",
  gio: null,
  ghiChu: "",
};

/** Ngày ở tương lai (so với hôm nay theo giờ VN) không được chọn. */
export function ngayTuongLaiBiChan(current: Dayjs): boolean {
  return current.format(DINH_DANG_NGAY) > homNayVN();
}

export interface GioBiChan {
  disabledHours: () => number[];
  disabledMinutes: (gioDaChon: number) => number[];
}

const KHONG_CHAN_GIO_NAO: GioBiChan = {
  disabledHours: () => [],
  disabledMinutes: () => [],
};

/**
 * Ngày đã chọn KHÔNG phải hôm nay (giờ VN) → không giờ nào bị chặn (đã ở quá
 * khứ, không thể "ở tương lai" được nữa, kể cả ngày chưa chọn).
 * Ngày đã chọn LÀ hôm nay → chặn mọi giờ/phút sau đúng thời điểm hiện tại,
 * tính bằng đồng hồ máy khách quy đổi ra giờ VN qua `gioVN` (không tự khai
 * lại phép quy đổi múi giờ ở đây).
 */
export function gioTuongLaiBiChan(ngay: string | null): GioBiChan {
  if (!ngay || ngay !== homNayVN()) return KHONG_CHAN_GIO_NAO;

  const [gioHienTai, phutHienTai] = gioVN(new Date().toISOString())
    .split(":")
    .map(Number);

  return {
    disabledHours: () =>
      Array.from(
        { length: Math.max(0, 23 - gioHienTai) },
        (_, i) => gioHienTai + 1 + i
      ),
    disabledMinutes: (gioDaChon: number) =>
      gioDaChon === gioHienTai
        ? Array.from(
            { length: Math.max(0, 59 - phutHienTai) },
            (_, i) => phutHienTai + 1 + i
          )
        : [],
  };
}

/**
 * Giá trị form đã validate (required rules đã pass) → DTO gửi BE.
 * Ném lỗi nếu thiếu trường bắt buộc — phòng hờ gọi ngoài luồng submit hợp lệ.
 */
export function formValuesToHrNhapDto(
  values: NhapBuFormValues
): HrNhapChamCongDto {
  if (!values.employeeId) throw new Error("Thiếu nhân viên");
  if (!values.ngay) throw new Error("Thiếu ngày");
  if (!values.gio) throw new Error("Thiếu giờ");

  return {
    employeeId: values.employeeId,
    ngay: values.ngay,
    loai: values.loai,
    gio: values.gio,
    ghiChu: values.ghiChu?.trim() || undefined,
  };
}
