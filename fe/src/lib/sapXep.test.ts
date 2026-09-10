import { describe, it, expect } from "vitest";
import { soSanhNhan, sapXepTheoNhan, sapXepTheo } from "./sapXep";

describe("soSanhNhan", () => {
  it("sắp đúng bảng chữ cái tiếng Việt, không đẩy dấu xuống cuối", () => {
    const ten = ["Đông", "Anh", "Ước", "Bình"].sort(soSanhNhan);
    expect(ten).toEqual(["Anh", "Bình", "Đông", "Ước"]);
  });

  it("không phân biệt hoa thường", () => {
    expect(soSanhNhan("anh", "Anh")).toBe(0);
    expect(["bình", "Anh"].sort(soSanhNhan)).toEqual(["Anh", "bình"]);
  });

  it("số trong nhãn so theo giá trị, không so từng ký tự", () => {
    expect(["Nhóm 10", "Nhóm 2"].sort(soSanhNhan)).toEqual(["Nhóm 2", "Nhóm 10"]);
  });

  it("nhãn rỗng / null không làm nổ", () => {
    expect(() => [null, undefined, "A"].sort(soSanhNhan)).not.toThrow();
  });
});

describe("sapXepTheoNhan", () => {
  it("sắp options theo label", () => {
    const out = sapXepTheoNhan([
      { value: "3", label: "Cà phê" },
      { value: "1", label: "Bánh mì" },
      { value: "2", label: "Ấm chén" },
    ]);
    expect(out.map((o) => o.label)).toEqual(["Ấm chén", "Bánh mì", "Cà phê"]);
  });

  it("không sửa mảng gốc", () => {
    const goc = [{ label: "B" }, { label: "A" }];
    const out = sapXepTheoNhan(goc);
    expect(goc.map((o) => o.label)).toEqual(["B", "A"]);
    expect(out.map((o) => o.label)).toEqual(["A", "B"]);
  });

  it("label là ReactNode thì rơi về ten", () => {
    const out = sapXepTheoNhan([
      { label: { type: "span" } as unknown, ten: "Bê" },
      { label: { type: "span" } as unknown, ten: "An" },
    ]);
    expect(out.map((o) => o.ten)).toEqual(["An", "Bê"]);
  });

  it("giữ nguyên số phần tử kể cả khi trùng nhãn", () => {
    const out = sapXepTheoNhan([{ label: "A", ten: "x" }, { label: "A", ten: "y" }]);
    expect(out).toHaveLength(2);
  });
});

describe("sapXepTheo", () => {
  it("sắp theo trường tự chọn", () => {
    const out = sapXepTheo([{ ma: "B", ten: "Bò" }, { ma: "A", ten: "Ai" }], (x) => x.ten);
    expect(out.map((x) => x.ma)).toEqual(["A", "B"]);
  });

  it("phần tử thiếu trường vẫn xử lý được", () => {
    const out = sapXepTheo([{ ten: "B" }, {} as { ten?: string }], (x) => x.ten);
    expect(out).toHaveLength(2);
    expect(out[1].ten).toBe("B");
  });
});
