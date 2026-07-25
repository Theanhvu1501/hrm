import type { CreateEmployeeDto } from "@/services/employeeService";
import type { HoSoNhanVienFormValues } from "../HoSoNhanVienForm.state";

/** `undefined`/`null`/NaN → không đưa khoá vào payload (nghĩa: kế thừa). */
function co(v: number | undefined | null): boolean {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Gộp 4 ô "cấu hình riêng" phẳng của form thành object `cauHinhLuongRieng` +
 * cờ `hopDongThu2` cho DTO.
 *
 * Hai quy tắc dễ làm sai và hoàn toàn vô hình trên màn hình:
 *
 * 1. Ô % ở form là PHẦN TRĂM (90), payload là TỶ LỆ (0.9) — quy đổi đúng một
 *    chỗ là ở đây. BE từ chối tỷ lệ ngoài [0,1] nên gửi 90 là 400.
 * 2. Ô để trống phải KHÔNG có khoá trong payload ("kế thừa cấu hình chung"),
 *    trong khi `0` là giá trị hợp lệ phải gửi đi. Dùng `Number.isFinite`,
 *    KHÔNG dùng `if (v)` — `0` sẽ bị rơi mất.
 *
 * Luôn trả về `cauHinhLuongRieng` (kể cả `{}`) để HR xoá trắng các ô rồi lưu
 * là thực sự bỏ được cấu hình riêng: `JSON.stringify` loại khoá `undefined`
 * khỏi body, và BE `update` là `Object.assign` — gửi `undefined` = "giữ nguyên
 * giá trị cũ", không phải "xoá".
 */
export function cauHinhLuongRiengToDto(
  values: HoSoNhanVienFormValues
): Pick<CreateEmployeeDto, "cauHinhLuongRieng" | "hopDongThu2"> {
  const rieng: NonNullable<CreateEmployeeDto["cauHinhLuongRieng"]> = {};

  if (co(values.orCongChuan)) rieng.congChuan = values.orCongChuan as number;
  if (co(values.orThuViecPhanTram))
    rieng.thuViecTyLe = (values.orThuViecPhanTram as number) / 100;
  if (co(values.orBhxhPhanTram))
    rieng.bhxhTyLe = (values.orBhxhPhanTram as number) / 100;
  if (values.orBhxhCanCu) rieng.bhxhCanCu = values.orBhxhCanCu;

  return { hopDongThu2: values.hopDongThu2 ?? false, cauHinhLuongRieng: rieng };
}

/** Nghịch đảo: từ hồ sơ BE về giá trị form (tỷ lệ → %). */
export function cauHinhLuongRiengToForm(
  rieng: CreateEmployeeDto["cauHinhLuongRieng"]
): Pick<
  HoSoNhanVienFormValues,
  "orCongChuan" | "orThuViecPhanTram" | "orBhxhPhanTram" | "orBhxhCanCu"
> {
  return {
    orCongChuan: rieng?.congChuan,
    orThuViecPhanTram: co(rieng?.thuViecTyLe)
      ? (rieng?.thuViecTyLe as number) * 100
      : undefined,
    orBhxhPhanTram: co(rieng?.bhxhTyLe)
      ? (rieng?.bhxhTyLe as number) * 100
      : undefined,
    orBhxhCanCu: rieng?.bhxhCanCu,
  };
}
