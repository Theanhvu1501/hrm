import { describe, it, expect } from "vitest";
import { mucLuongInTrenHopDong } from "./mucLuongHopDong";

describe("mucLuongInTrenHopDong", () => {
  const MAC_DINH = 5_500_000;

  it("lấy MỨC KHAI BÁO của nhân viên, không phải lương thoả thuận", () => {
    // Đây là toàn bộ luật: hợp đồng lao động ghi mức khai báo (số đăng ký
    // BHXH), không phải số thực nhận.
    expect(
      mucLuongInTrenHopDong(
        { mucKhaiBao: 8_000_000, luongThoaThuan: 20_000_000 },
        MAC_DINH,
      ),
    ).toBe(8_000_000);
  });

  it("chưa khai mức (undefined/null/0) → mức mặc định của công ty", () => {
    // Cùng quy tắc `mucKhaiBaoApDung` bên BE: 0 là CHƯA KHAI, không phải một
    // mức bằng 0 — hợp đồng in "Mức lương: 0 đồng" là không ký được.
    expect(mucLuongInTrenHopDong({ mucKhaiBao: undefined }, MAC_DINH)).toBe(MAC_DINH);
    expect(mucLuongInTrenHopDong({ mucKhaiBao: 0 }, MAC_DINH)).toBe(MAC_DINH);
    expect(mucLuongInTrenHopDong({ mucKhaiBao: -1 }, MAC_DINH)).toBe(MAC_DINH);
  });

  it("không chọn nhân viên → undefined, KHÔNG tự điền số nào", () => {
    // Điền sẵn một con số khi chưa biết là ai thì HR rất dễ bấm Lưu luôn.
    expect(mucLuongInTrenHopDong(undefined, MAC_DINH)).toBeUndefined();
  });

  it("chưa tải được cấu hình lương → vẫn trả mức khai báo nếu có", () => {
    expect(mucLuongInTrenHopDong({ mucKhaiBao: 8_000_000 }, undefined)).toBe(
      8_000_000,
    );
  });

  it("chưa khai mà cũng chưa có mức mặc định → undefined, để HR tự điền", () => {
    expect(mucLuongInTrenHopDong({ mucKhaiBao: 0 }, undefined)).toBeUndefined();
  });
});
