import { describe, it, expect } from "vitest";
import { aoaToRawRows } from "../parseRows";

describe("aoaToRawRows", () => {
  const header = [
    "Ngày chứng từ", "Số tiền", "Nội dung", "Người giao dịch", "Địa chỉ", "Ghi chú",
  ];

  it("bỏ dòng header, map theo vị trí cột, rowNumber bắt đầu từ 2", () => {
    const aoa = [
      header,
      ["01/06/2026", "1000000", "Thu tiền bán hàng", "Nguyễn A", "Hà Nội", ""],
    ];
    const rows = aoaToRawRows(aoa);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      rowNumber: 2,
      ngay: "01/06/2026",
      soTien: "1000000",
      noiDung: "Thu tiền bán hàng",
      nguoiGiaoDich: "Nguyễn A",
      diaChi: "Hà Nội",
      ghiChu: "",
    });
  });

  it("bỏ qua dòng trống hoàn toàn", () => {
    const aoa = [header, ["", "", "", "", "", ""], ["01/06/2026", "1000000", "", "", "", ""]];
    const rows = aoaToRawRows(aoa);
    expect(rows).toHaveLength(1);
    expect(rows[0].rowNumber).toBe(3);
  });

  it("aoa rỗng hoặc chỉ có header → mảng rỗng", () => {
    expect(aoaToRawRows([])).toEqual([]);
    expect(aoaToRawRows([header])).toEqual([]);
  });
});
