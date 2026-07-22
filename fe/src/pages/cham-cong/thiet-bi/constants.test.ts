import { describe, it, expect } from "vitest";
import { TRANG_THAI_OPTIONS, TAB_OPTIONS, labelFor } from "./constants";

describe("labelFor", () => {
  it("trả về đúng nhãn tiếng Việt khớp value", () => {
    expect(labelFor(TRANG_THAI_OPTIONS, "cho_duyet")).toBe("Chờ duyệt");
    expect(labelFor(TRANG_THAI_OPTIONS, "da_duyet")).toBe("Đã duyệt");
    expect(labelFor(TRANG_THAI_OPTIONS, "tu_choi")).toBe("Đã từ chối");
    expect(labelFor(TRANG_THAI_OPTIONS, "thu_hoi")).toBe("Đã thu hồi");
  });

  it("nhãn tab của da_duyet cố ý khác nhãn cột trạng thái", () => {
    expect(labelFor(TAB_OPTIONS, "da_duyet")).toBe("Đang dùng");
    expect(labelFor(TRANG_THAI_OPTIONS, "da_duyet")).toBe("Đã duyệt");
  });

  it("trả về value gốc nếu không khớp option nào (trạng thái lạ, không rơi)", () => {
    expect(labelFor(TRANG_THAI_OPTIONS, "trang_thai_la")).toBe("trang_thai_la");
  });

  it("trả về '-' khi value rỗng hoặc undefined", () => {
    expect(labelFor(TRANG_THAI_OPTIONS, undefined)).toBe("-");
    expect(labelFor(TRANG_THAI_OPTIONS, "")).toBe("-");
  });
});
