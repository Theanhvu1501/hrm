import { describe, it, expect } from "vitest";
import { conBaoNhieuNgay, mucCanhBao } from "./sapHetHan";

describe("conBaoNhieuNgay", () => {
  it("đếm số ngày từ hôm nay tới hạn dùng", () => {
    expect(conBaoNhieuNgay("2026-08-30", "2026-08-01")).toBe(29);
  });

  it("hạn dùng là hôm nay trả 0", () => {
    expect(conBaoNhieuNgay("2026-08-01", "2026-08-01")).toBe(0);
  });

  it("đã quá hạn trả số âm", () => {
    expect(conBaoNhieuNgay("2026-07-31", "2026-08-01")).toBe(-1);
  });
});

describe("mucCanhBao", () => {
  it("quá hạn là het_han", () => {
    expect(mucCanhBao("2026-07-31", "2026-08-01")).toBe("het_han");
  });

  it("dưới 30 ngày là sap_het", () => {
    expect(mucCanhBao("2026-08-20", "2026-08-01")).toBe("sap_het");
  });

  it("còn nhiều là binh_thuong", () => {
    expect(mucCanhBao("2026-12-31", "2026-08-01")).toBe("binh_thuong");
  });

  // '9999-12-31' = không hết hạn (xem hanDungCuaKy ở BE) — tô cảnh báo cho nó
  // là báo động giả vĩnh viễn.
  it("mốc vô hạn luôn bình thường", () => {
    expect(mucCanhBao("9999-12-31", "2026-08-01")).toBe("binh_thuong");
  });
});
