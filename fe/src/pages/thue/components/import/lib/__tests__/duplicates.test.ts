import { describe, it, expect } from "vitest";
import {
  buildHoaDonKey,
  findDuplicateKeysInFile,
  applyDuplicateWarnings,
} from "../duplicates";
import { RowValidationResult } from "../columns";

describe("buildHoaDonKey", () => {
  it("chuẩn hóa trim + viết hoa", () => {
    expect(buildHoaDonKey(" 0000123 ", "1c25taa", " 0101243150")).toBe(
      "0000123|1C25TAA|0101243150",
    );
  });

  it("trường thiếu thành chuỗi rỗng", () => {
    expect(buildHoaDonKey("0000123")).toBe("0000123||");
  });
});

describe("findDuplicateKeysInFile", () => {
  it("chỉ trả khóa xuất hiện từ 2 lần", () => {
    const dup = findDuplicateKeysInFile(["a", "b", "a", "c", "a"]);
    expect([...dup]).toEqual(["a"]);
  });

  it("không có trùng → tập rỗng", () => {
    expect(findDuplicateKeysInFile(["a", "b"]).size).toBe(0);
  });
});

const result = (over: Partial<RowValidationResult> = {}): RowValidationResult => ({
  rowNumber: 2,
  errors: [],
  warnings: [],
  item: null,
  key: "A||",
  ...over,
});

describe("applyDuplicateWarnings", () => {
  it("thêm cảnh báo khi hóa đơn đã có trên hệ thống", () => {
    const [r] = applyDuplicateWarnings([result()], ["A||"]);
    expect(r.warnings.map((w) => w.message)).toEqual([
      "Hóa đơn đã tồn tại trên hệ thống",
    ]);
    expect(r.errors).toEqual([]);
  });

  it("thêm cảnh báo khi trùng với dòng khác trong cùng file", () => {
    const rows = applyDuplicateWarnings(
      [result({ rowNumber: 2 }), result({ rowNumber: 3 })],
      [],
    );
    expect(rows.map((r) => r.warnings[0].message)).toEqual([
      "Trùng với dòng khác trong cùng file",
      "Trùng với dòng khác trong cùng file",
    ]);
  });

  it("cảnh báo cả hai khi vừa trùng file vừa trùng hệ thống", () => {
    const rows = applyDuplicateWarnings(
      [result({ rowNumber: 2 }), result({ rowNumber: 3 })],
      ["A||"],
    );
    expect(rows[0].warnings).toHaveLength(2);
  });

  it("giữ nguyên cảnh báo sẵn có", () => {
    const existing = { field: "mst", message: "MST lạ" };
    const [r] = applyDuplicateWarnings([result({ warnings: [existing] })], ["A||"]);
    expect(r.warnings[0]).toEqual(existing);
    expect(r.warnings).toHaveLength(2);
  });

  it("bỏ qua dòng không có khóa", () => {
    const [r] = applyDuplicateWarnings([result({ key: "" })], ["A||"]);
    expect(r.warnings).toEqual([]);
  });

  it("không đụng dòng không trùng", () => {
    const input = [result()];
    const [r] = applyDuplicateWarnings(input, ["KHAC||"]);
    expect(r).toBe(input[0]);
  });
});
