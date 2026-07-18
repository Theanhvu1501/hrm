import { describe, it, expect } from "vitest";
import { validateAndBuild, ImportMasterData } from "../validate";
import { RawImportRow } from "../columns";

const masterData: ImportMasterData = {
  doiTuongList: [{ id: "dt1", ma: "KH001", ten: "KH A", loai: ["KHACH_HANG"] }] as ImportMasterData["doiTuongList"],
  duAnList: [],
  boPhanList: [],
  sanPhamList: [],
  dongTienList: [],
  khoanMucList: [],
  hopDongList: [],
  nhomKhuyenMaiList: [],
  nhomQuanLyList: [],
};

function row(over: Partial<RawImportRow> = {}): RawImportRow {
  return {
    rowNumber: 2,
    ngay: "01/06/2026",
    soTien: "1000000",
    noiDung: "Thu tiền bán hàng",
    ...over,
  };
}

describe("validateAndBuild (phiếu thu/chi)", () => {
  it("dòng hợp lệ → item dựng đủ, không lỗi", () => {
    const res = validateAndBuild([row()], masterData);
    expect(res.hasErrors).toBe(false);
    expect(res.validItems).toHaveLength(1);
    const item = res.validItems[0];
    expect(item.ngay).toBe("2026-06-01");
    expect(item.soTien).toBe(1000000);
    expect(item.noiDung).toBe("Thu tiền bán hàng");
    // không có loai, taiKhoanNo, taiKhoanCo, loaiGiaoDich
    expect((item as Record<string, unknown>).loai).toBeUndefined();
    expect(item.danhMuc?.taiKhoanNo).toBeUndefined();
  });

  it("thiếu ngày → lỗi", () => {
    const res = validateAndBuild([row({ ngay: "" })], masterData);
    expect(res.hasErrors).toBe(true);
    expect(res.results[0].errors.some((e) => e.field === "ngay")).toBe(true);
    expect(res.results[0].item).toBeNull();
  });

  it("thiếu soTien → lỗi", () => {
    const res = validateAndBuild([row({ soTien: "" })], masterData);
    expect(res.hasErrors).toBe(true);
    expect(res.results[0].errors.some((e) => e.field === "soTien")).toBe(true);
  });

  it("ngày sai định dạng → lỗi", () => {
    const res = validateAndBuild([row({ ngay: "2026-06-01" })], masterData);
    expect(res.results[0].errors.some((e) => e.field === "ngay")).toBe(true);
  });

  it("số tiền <= 0 → lỗi", () => {
    const res = validateAndBuild([row({ soTien: "0" })], masterData);
    expect(res.results[0].errors.some((e) => e.field === "soTien")).toBe(true);
  });

  it("chiều phân bổ có mã nhưng không tồn tại → lỗi", () => {
    const res = validateAndBuild([row({ doiTuong: "KHONG_CO" })], masterData);
    expect(res.results[0].errors.some((e) => e.field === "doiTuong")).toBe(true);
  });

  it("chiều phân bổ khớp mã → vào danhMuc", () => {
    const res = validateAndBuild([row({ doiTuong: "KH001" })], masterData);
    expect(res.hasErrors).toBe(false);
    expect(res.validItems[0].danhMuc?.doiTuong?.ma).toBe("KH001");
  });

  it("chiều phân bổ dạng dropdown 'Mã - Tên' → tự tách mã", () => {
    const res = validateAndBuild(
      [row({ doiTuong: "KH001 - KH A" })],
      masterData,
    );
    expect(res.hasErrors).toBe(false);
    expect(res.validItems[0].danhMuc?.doiTuong?.ma).toBe("KH001");
  });

  it("batch hỗn hợp: 1 hợp lệ + 1 lỗi → hasErrors true, validItems 1 phần tử, results 2 phần tử", () => {
    const validRow = row({ rowNumber: 2 });
    const errorRow = row({ rowNumber: 3, ngay: "" });
    const res = validateAndBuild([validRow, errorRow], masterData);
    expect(res.hasErrors).toBe(true);
    expect(res.validItems).toHaveLength(1);
    expect(res.results).toHaveLength(2);
  });

  it("noiDung không bắt buộc - có thể để trống", () => {
    const res = validateAndBuild([row({ noiDung: "" })], masterData);
    expect(res.hasErrors).toBe(false);
    expect(res.validItems[0].noiDung).toBe("");
  });
});
