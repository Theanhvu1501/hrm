import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import * as XLSX from "xlsx";

dayjs.extend(customParseFormat);

/**
 * Excel lưu ngày là số ngày kể từ 30/12/1899 (46053 = 31/01/2026); phần thập phân là giờ.
 * Đọc thẳng số này ra ngày/tháng/năm — không đi qua Date nên không dính múi giờ.
 */
function serialToIsoDate(serial: number): string | null {
  if (!Number.isFinite(serial) || serial <= 0) return null;

  const parts = XLSX.SSF.parse_date_code(serial) as {
    y: number;
    m: number;
    d: number;
  } | null;
  if (!parts?.y) return null;

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parts.y}-${pad(parts.m)}-${pad(parts.d)}`;
}

/** Chuẩn hóa số tiền từ chuỗi/ số Excel về number, hoặc null nếu không hợp lệ. */
export function normalizeAmount(raw: string | number | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;

  let s = String(raw).trim();
  if (s === "") return null;
  s = s.replace(/[^\d.,-]/g, "");
  if (s === "" || s === "-") return null;

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");

  if (hasDot && hasComma) {
    // Dấu xuất hiện sau cùng là thập phân, dấu còn lại là ngăn cách nghìn
    const lastSep = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
    const intPart = s.slice(0, lastSep).replace(/[.,]/g, "");
    const decPart = s.slice(lastSep + 1).replace(/[.,]/g, "");
    s = `${intPart}.${decPart}`;
  } else if (hasComma) {
    const parts = s.split(",");
    // Nhiều phẩy, hoặc nhóm cuối đúng 3 chữ số → ngăn cách nghìn
    if (parts.length > 2 || parts[parts.length - 1].length === 3) {
      s = s.replace(/,/g, "");
    } else {
      s = s.replace(",", ".");
    }
  } else if (hasDot) {
    const parts = s.split(".");
    if (parts.length > 2 || parts[parts.length - 1].length === 3) {
      s = s.replace(/\./g, "");
    }
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Chuẩn hóa ngày về 'YYYY-MM-DD'; nhận chuỗi DD/MM/YYYY hoặc serial ngày của Excel.
 * Trả null nếu sai định dạng.
 *
 * Đọc sheet bằng `XLSX.read(buf)` để ô ngày về đây dạng số. ĐỪNG dùng
 * `{ cellDates: true }`: xlsx@0.18.5 đổi serial thành Date sớm 30 giây so với
 * nửa đêm (46053 → 30/01/2026 23:59:30), cắt phần ngày ra là rớt về hôm trước.
 */
export function normalizeDate(raw: string | number | undefined | null): string | null {
  if (raw === undefined || raw === null) return null;

  if (typeof raw === "number") return serialToIsoDate(raw);

  const s = raw.trim();
  if (s === "") return null;

  const d = dayjs(s, ["DD/MM/YYYY", "D/M/YYYY", "D/MM/YYYY", "DD/M/YYYY"], true);
  return d.isValid() ? d.format("YYYY-MM-DD") : null;
}
