import { describe, it, expect } from "vitest";
import { docTienBangChu } from "../docTienBangChu";

describe("docTienBangChu", () => {
  it("đọc số 0", () => {
    expect(docTienBangChu(0)).toBe("Không đồng");
  });

  it("đọc hàng nghìn tròn", () => {
    expect(docTienBangChu(1000)).toBe("Một nghìn đồng");
  });

  it("đọc số nhiều hàng có 'tư' và 'lẻ'", () => {
    expect(docTienBangChu(1234567)).toBe(
      "Một triệu hai trăm ba mươi tư nghìn năm trăm sáu mươi bảy đồng"
    );
  });

  it("đọc 'mốt' và 'lăm'", () => {
    expect(docTienBangChu(21)).toBe("Hai mươi mốt đồng");
    expect(docTienBangChu(25)).toBe("Hai mươi lăm đồng");
    expect(docTienBangChu(15)).toBe("Mười lăm đồng");
  });

  it("đọc 'lẻ' khi thiếu hàng chục", () => {
    expect(docTienBangChu(105)).toBe("Một trăm lẻ năm đồng");
  });

  it("đọc hàng tỷ tròn", () => {
    expect(docTienBangChu(1000000000)).toBe("Một tỷ đồng");
  });

  it("làm tròn số âm/thập phân về phần nguyên dương", () => {
    expect(docTienBangChu(1000.9)).toBe("Một nghìn đồng");
    expect(docTienBangChu(-1000)).toBe("Một nghìn đồng");
  });
});
