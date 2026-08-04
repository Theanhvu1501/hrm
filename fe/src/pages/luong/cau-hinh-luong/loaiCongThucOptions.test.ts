import { describe, it, expect } from "vitest";
import { LOAI_CONG_THUC_OPTIONS } from "./components/KhoanLuongEditor";
import type { LoaiCongThuc } from "@/services/cauHinhLuongService";

/**
 * Dropdown "Loại công thức" phải phủ ĐỦ mọi giá trị `LoaiCongThuc`.
 *
 * Bản P4.2c-2 thêm `TIEN_OT` ở backend nhưng quên đồng bộ dropdown — hệ quả
 * là KHÔNG có đường nào tạo khoản tiền làm thêm từ giao diện, tức toàn bộ
 * tính năng tiền OT không bật được, mà không có lỗi nào hiện ra.
 */
describe("LOAI_CONG_THUC_OPTIONS", () => {
  it("phủ đủ mọi loại công thức engine hiểu", () => {
    const TAT_CA: LoaiCongThuc[] = [
      "LUONG_THEO_CONG",
      "DINH_MUC_x_CONG",
      "CO_DINH_THANG",
      "PHAN_TRAM_BASE",
      "NHAP_THEO_KY",
      "TIEN_OT",
    ];

    expect(LOAI_CONG_THUC_OPTIONS.map((o) => o.value).sort()).toEqual(
      [...TAT_CA].sort(),
    );
  });

  it("mọi lựa chọn đều có nhãn tiếng Việt, không để lộ mã thô", () => {
    for (const o of LOAI_CONG_THUC_OPTIONS) {
      expect(o.label).toBeTruthy();
      expect(o.label).not.toBe(o.value);
    }
  });
});
