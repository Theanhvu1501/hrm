import { describe, it, expect } from "vitest";
import { aoaToRawRows, missingRequiredColumns } from "../parseRows";
import { buildColumns } from "../columns";

const columns = buildColumns("mua");
const header = columns.map((c) => c.header);

/** Header file mẫu CŨ: 9 cột, chưa có Tiền thuế / Tổng thanh toán. */
const HEADER_9_CU = [
  "Ngày hóa đơn",
  "Số hóa đơn",
  "Ký hiệu",
  "Tên người bán",
  "MST người bán",
  "Tên hàng hóa / dịch vụ",
  "Giá trị chưa thuế",
  "Thuế suất",
  "Ghi chú",
];

describe("missingRequiredColumns", () => {
  it("file mẫu đủ cột → không thiếu gì", () => {
    expect(missingRequiredColumns([header], columns)).toEqual([]);
  });

  it("bỏ qua hoa thường, khoảng trắng thừa và dấu tiếng Việt", () => {
    const messy = header.map((h) => `  ${h.toUpperCase()} `);
    expect(missingRequiredColumns([messy], columns)).toEqual([]);
    expect(
      missingRequiredColumns(
        [["NGAY HOA DON", "so hoa don", "Tên người bán", "Gia tri chua thue", "thue suat"]],
        columns,
      ),
    ).toEqual([]);
  });

  it("header sai thứ tự vẫn hợp lệ (khớp theo tên, không theo vị trí)", () => {
    const swapped = [...header];
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    expect(missingRequiredColumns([swapped], columns)).toEqual([]);
  });

  it("file mẫu CŨ 9 cột vẫn hợp lệ (2 cột mới không bắt buộc)", () => {
    expect(missingRequiredColumns([HEADER_9_CU], columns)).toEqual([]);
  });

  it("header của biến thể khác → thiếu cột tên đối tác", () => {
    const banHeader = buildColumns("ban").map((c) => c.header);
    expect(missingRequiredColumns([banHeader], columns)).toEqual(["Tên người bán"]);
  });

  it("thiếu cột bắt buộc → nêu đúng tên cột thiếu", () => {
    const aoa = [["Ngày hóa đơn", "Số hóa đơn", "Ghi chú"]];
    expect(missingRequiredColumns(aoa, columns)).toEqual([
      "Tên người bán",
      "Giá trị chưa thuế",
      "Thuế suất",
    ]);
  });

  it("file rỗng → thiếu toàn bộ cột bắt buộc", () => {
    expect(missingRequiredColumns([], columns)).toEqual([
      "Ngày hóa đơn",
      "Số hóa đơn",
      "Tên người bán",
      "Giá trị chưa thuế",
      "Thuế suất",
    ]);
  });
});

describe("aoaToRawRows", () => {
  it("bỏ header, đọc ô theo tên cột, rowNumber tính theo Excel", () => {
    const aoa = [
      header,
      [
        "01/06/2026",
        "0000123",
        "1C25TAA",
        "Cty A",
        "0101243150",
        "VPP",
        10000000,
        "10 - 10%",
        "",
        "",
        "",
      ],
    ];
    const rows = aoaToRawRows(aoa, columns);

    expect(rows).toHaveLength(1);
    expect(rows[0].rowNumber).toBe(2);
    expect(rows[0].soHoaDon).toBe("0000123");
    expect(rows[0].giaTriChuaThue).toBe(10000000);
  });

  it("file mẫu mới: đọc được Tiền thuế và Tổng thanh toán", () => {
    const aoa = [
      header,
      [
        "01/06/2026",
        "0000123",
        "1C25TAA",
        "Cty A",
        "0101243150",
        "VPP",
        1000000,
        "10 - 10%",
        99998,
        1099998,
        "ghi chú",
      ],
    ];
    const rows = aoaToRawRows(aoa, columns);

    expect(rows[0].tienThue).toBe(99998);
    expect(rows[0].tongThanhToan).toBe(1099998);
    expect(rows[0].ghiChu).toBe("ghi chú");
  });

  it("file mẫu CŨ 9 cột: Ghi chú không bị lệch cột, 2 cột mới rỗng", () => {
    const aoa = [
      HEADER_9_CU,
      ["01/06/2026", "0000123", "1C25TAA", "Cty A", "0101243150", "VPP", 1000000, "10 - 10%", "ghi chú"],
    ];
    const rows = aoaToRawRows(aoa, columns);

    expect(rows[0].giaTriChuaThue).toBe(1000000);
    expect(rows[0].ghiChu).toBe("ghi chú");
    expect(rows[0].tienThue).toBe("");
    expect(rows[0].tongThanhToan).toBe("");
  });

  it("cột xếp sai thứ tự vẫn đọc đúng từng ô", () => {
    const aoa = [
      ["Số hóa đơn", "Ngày hóa đơn", "Thuế suất", "Giá trị chưa thuế", "Tên người bán"],
      ["0000123", "01/06/2026", "10 - 10%", 1000000, "Cty A"],
    ];
    const rows = aoaToRawRows(aoa, columns);

    expect(rows[0].soHoaDon).toBe("0000123");
    expect(rows[0].giaTriChuaThue).toBe(1000000);
    expect(rows[0].ten).toBe("Cty A");
  });

  it("giữ nguyên ô số (serial ngày, số tiền) — không ép về chuỗi", () => {
    const rows = aoaToRawRows(
      [header, [46053, "1", "", "A", "", "", 1500.75, "10", "", "", ""]],
      columns,
    );
    expect(rows[0].ngayHoaDon).toBe(46053);
    expect(rows[0].giaTriChuaThue).toBe(1500.75);
  });

  it("bỏ qua dòng trống hoàn toàn nhưng giữ đúng rowNumber các dòng sau", () => {
    const aoa = [
      header,
      ["", "", "", "", "", "", "", "", "", "", ""],
      ["01/06/2026", "0000123", "", "Cty A", "", "", "1000", "10", "", "", ""],
    ];
    const rows = aoaToRawRows(aoa, columns);

    expect(rows).toHaveLength(1);
    expect(rows[0].rowNumber).toBe(3);
  });

  it("trả mảng rỗng khi file chỉ có header", () => {
    expect(aoaToRawRows([header], columns)).toEqual([]);
    expect(aoaToRawRows([], columns)).toEqual([]);
  });

  it("cắt khoảng trắng thừa hai đầu ô", () => {
    const rows = aoaToRawRows(
      [header, ["01/06/2026", "  0000123  ", "", "A", "", "", "1000", "10", "", "", ""]],
      columns,
    );
    expect(rows[0].soHoaDon).toBe("0000123");
  });
});
