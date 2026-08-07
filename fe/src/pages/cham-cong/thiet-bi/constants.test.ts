import { describe, it, expect } from "vitest";
import {
  TRANG_THAI_OPTIONS,
  TAB_OPTIONS,
  labelFor,
  choPhepKichHoatLai,
} from "./constants";

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

/**
 * Điều kiện hiện nút "Kích hoạt lại" phải khớp đúng luật BE trong
 * `kichHoatLai()` (chỉ nhận thu_hoi/tu_choi). Lệch một bên là HR bấm được
 * một nút chắc chắn lỗi, hoặc mất nút ở đúng dòng cần mở.
 */
describe("choPhepKichHoatLai", () => {
  it("cho phép với máy đã thu hồi và đã từ chối", () => {
    expect(choPhepKichHoatLai("thu_hoi")).toBe(true);
    expect(choPhepKichHoatLai("tu_choi")).toBe(true);
  });

  it("không cho phép với máy đang chờ duyệt hoặc đang dùng", () => {
    // cho_duyet đã có nút Duyệt/Từ chối; da_duyet đang chạy bình thường —
    // hiện thêm nút mở khoá ở đây chỉ tổ gây nhầm.
    expect(choPhepKichHoatLai("cho_duyet")).toBe(false);
    expect(choPhepKichHoatLai("da_duyet")).toBe(false);
  });

  it("không cho phép với trạng thái lạ hoặc thiếu", () => {
    expect(choPhepKichHoatLai("trang_thai_la")).toBe(false);
    expect(choPhepKichHoatLai(undefined)).toBe(false);
  });
});
