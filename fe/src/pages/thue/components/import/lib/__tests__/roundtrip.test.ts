import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { buildTemplateWorkbook } from "../template";
import { aoaToRawRows, missingRequiredColumns } from "../parseRows";
import { validateRows } from "../validate";
import { BangKeVariant, buildColumns } from "../columns";

/**
 * File mẫu tải về phải tự đọc lại được: header khớp, dòng ví dụ parse sạch lỗi.
 * Bắt lỗi lệch tiêu đề cột và chuỗi dropdown ("10 - 10%") không tách được mã.
 */
async function readTemplateBack(variant: BangKeVariant) {
  const wb = buildTemplateWorkbook(variant);
  const buffer = await wb.xlsx.writeBuffer();

  return readSheetAoa(buffer);
}

/** Đọc y hệt ImportBangKeModal: không cellDates, raw. */
function readSheetAoa(buffer: ArrayBuffer | Uint8Array): unknown[][] {
  const read = XLSX.read(buffer, { type: "array" });
  const ws = read.Sheets[read.SheetNames[0]];
  return XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: true,
    defval: "",
  }) as unknown[][];
}

/**
 * File do Excel/hóa đơn điện tử xuất ra lưu ngày là serial nguyên (46053 = 31/01/2026).
 * Template tự ghi qua exceljs đã bù sẵn 30 giây nên KHÔNG lộ được lỗi lệch ngày.
 */
describe("ô ngày là serial nguyên như Excel thật", () => {
  it("serial 46053 → 31/01/2026, không lùi về 30/01", () => {
    const headers = buildColumns("mua").map((c) => c.header);
    const ws = XLSX.utils.aoa_to_sheet([
      headers,
      [null, "0000123", "1C25TAA", "Công ty A", "0100686223", "Dịch vụ", 10_000_000, "10", ""],
    ]);
    ws["A2"] = { t: "n", v: 46053, z: "dd/mm/yyyy" };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "S");
    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });

    const rows = aoaToRawRows(readSheetAoa(buffer), buildColumns("mua"));
    const { validItems, results } = validateRows(rows, "mua");

    expect(results[0].errors).toEqual([]);
    expect(validItems[0].ngayHoaDon).toBe("2026-01-31");
  });
});

describe.each(["mua", "ban"] as const)("round-trip template %s", (variant) => {
  it("sheet đầu tiên là sheet dữ liệu, có đủ cột bắt buộc", async () => {
    const aoa = await readTemplateBack(variant);
    expect(missingRequiredColumns(aoa, buildColumns(variant))).toEqual([]);
  });

  it("dòng ví dụ đọc lại được và validate không lỗi", async () => {
    const aoa = await readTemplateBack(variant);
    const rows = aoaToRawRows(aoa, buildColumns(variant));
    expect(rows).toHaveLength(1);

    const { hasErrors, validItems, results } = validateRows(rows, variant);
    expect(results[0].errors).toEqual([]);
    expect(hasErrors).toBe(false);

    expect(validItems[0]).toMatchObject({
      ngayHoaDon: "2026-06-01",
      soHoaDon: "0000123",
      kyHieuHoaDon: "1C25TAA",
      giaTriChuaThue: 10_000_000,
      thueSuat: "10", // tách được mã từ chuỗi dropdown "10 - 10%"
    });
  });

  it("file mẫu của biến thể kia bị từ chối: thiếu cột tên đối tác", async () => {
    const other: BangKeVariant = variant === "mua" ? "ban" : "mua";
    const aoa = await readTemplateBack(other);
    const expected = variant === "mua" ? "Tên người bán" : "Tên người mua";
    expect(missingRequiredColumns(aoa, buildColumns(variant))).toEqual([expected]);
  });
});
