import { DatePicker } from "antd";
import type { DatePickerProps } from "antd";
import dayjs from "dayjs";

const DINH_DANG_LUU = "YYYY-MM-DD";

type Props = Omit<DatePickerProps, "value" | "onChange" | "picker"> & {
  /** Chuỗi `YYYY-MM-DD` như ô `<input type="date">` cũ; `''`/null/undefined = trống. */
  value?: string | null;
  /** Trả đúng chuỗi `YYYY-MM-DD`, xoá trắng thì trả `''` — giữ nguyên hợp đồng
   *  dữ liệu của ô date gốc để các hàm convert sang DTO không phải đổi. */
  onChange?: (value: string) => void;
};

/**
 * Ô chọn ngày antd thay cho `<Input type="date">` gốc của trình duyệt — ô gốc
 * hiện theo locale máy (mm/dd/yyyy trên máy tiếng Anh) và lệch hẳn kiểu với
 * phần còn lại của hệ thống. Hiển thị DD/MM/YYYY như ke-toan-so.
 */
export function OChonNgay({ value, onChange, className, ...rest }: Props) {
  // `YYYY-MM-DD` là ISO nên dayjs đọc thẳng, không cần plugin customParseFormat.
  const ngay = value ? dayjs(value) : null;
  return (
    <DatePicker
      format="DD/MM/YYYY"
      placeholder="dd/mm/yyyy"
      className={className ?? "w-full"}
      {...rest}
      value={ngay && ngay.isValid() ? ngay : null}
      onChange={(d) => {
        // Kiểu của antd gộp cả chế độ chọn nhiều ngày (mảng) — ô này luôn chọn một.
        const mot = Array.isArray(d) ? d[0] : d;
        onChange?.(mot ? mot.format(DINH_DANG_LUU) : "");
      }}
    />
  );
}

export default OChonNgay;
