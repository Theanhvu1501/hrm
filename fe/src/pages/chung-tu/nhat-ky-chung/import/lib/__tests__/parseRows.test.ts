import { describe, it, expect } from "vitest";
import { aoaToRawRows } from "../parseRows";

describe("aoaToRawRows", () => {
  const header = [
    "Ngày chứng từ", "Loại giao dịch", "Nghiệp vụ", "TK Nợ", "TK Có", "Số tiền",
  ];

  it("bỏ dòng header, map theo vị trí cột, rowNumber bắt đầu từ 2", () => {
    const aoa = [
      header,
      ["01/06/2026", "PHIEU_THU", "NV01", "111", "511", "1000"],
    ];
    const rows = aoaToRawRows(aoa);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      rowNumber: 2,
      ngay: "01/06/2026",
      loaiGiaoDich: "PHIEU_THU",
      nghiepVu: "NV01",
      taiKhoanNo: "111",
      taiKhoanCo: "511",
      soTien: "1000",
    });
  });

  it("bỏ qua dòng trống hoàn toàn", () => {
    const aoa = [header, ["", "", "", "", "", ""], ["01/06/2026", "PHIEU_THU", "NV01", "111", "511", "1000"]];
    const rows = aoaToRawRows(aoa);
    expect(rows).toHaveLength(1);
    expect(rows[0].rowNumber).toBe(3);
  });

  it("aoa rỗng hoặc chỉ có header → mảng rỗng", () => {
    expect(aoaToRawRows([])).toEqual([]);
    expect(aoaToRawRows([header])).toEqual([]);
  });
});
