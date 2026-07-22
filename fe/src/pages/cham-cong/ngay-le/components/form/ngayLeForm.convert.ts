/**
 * Chuyển đổi thuần giữa `Holiday` (BE) và giá trị form `NgayLeForm.tsx`.
 * Tách riêng khỏi component để có thể unit test không cần render React.
 */
import { CreateHolidayDto, Holiday } from "@/services/holidayService";

/** Khoảng ngày nghỉ dạng chuỗi "YYYY-MM-DD" (cả hai đầu), khớp định dạng BE. */
export type KhoangNgay = [string, string];

export interface NgayLeFormValues {
  ten: string;
  khoang: KhoangNgay | null;
  loai: string;
  huongLuong: boolean;
  moTa?: string;
}

export const NGAY_LE_FORM_DEFAULT_VALUES: NgayLeFormValues = {
  ten: "",
  khoang: null,
  loai: "le",
  huongLuong: true,
  moTa: "",
};

/** Holiday đang sửa → giá trị form. `null` (thêm mới) → giá trị mặc định. */
export function holidayToFormValues(holiday: Holiday | null): NgayLeFormValues {
  if (!holiday) return NGAY_LE_FORM_DEFAULT_VALUES;

  return {
    ten: holiday.ten,
    khoang: [holiday.tuNgay, holiday.denNgay],
    loai: holiday.loai,
    huongLuong: holiday.huongLuong,
    moTa: holiday.moTa || "",
  };
}

/**
 * Giá trị form đã validate (khoang bắt buộc chọn) → DTO gửi BE.
 * Ném lỗi nếu `khoang` rỗng — chỉ nên gọi sau khi RangePicker required đã pass.
 */
export function formValuesToCreateDto(values: NgayLeFormValues): CreateHolidayDto {
  if (!values.khoang) {
    throw new Error("Thiếu khoảng ngày nghỉ");
  }
  const [tuNgay, denNgay] = values.khoang;

  return {
    ten: values.ten,
    tuNgay,
    denNgay,
    loai: values.loai,
    huongLuong: values.huongLuong,
    moTa: values.moTa || undefined,
  };
}
