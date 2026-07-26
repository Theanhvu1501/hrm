import { describe, it, expect } from "vitest";
import { dienGiaiThueVaBaoHiem, phanTram } from "./luongTab.dienGiai";
import type { CauHinhLuong } from "@/services/cauHinhLuongService";

const CAU_HINH = {
  bhxh: { tyLe: 0.105, canCu: "MUC_KHAI_BAO" },
  bhCongTy: { tyLe: 0.215, tyLeHopDongThu2: 0.005 },
  quyTacThoiVu: { tyLe: 0.1, nguong: 2_000_000 },
} as unknown as CauHinhLuong;

describe("phanTram", () => {
  it("đổi tỷ lệ 0..1 sang % kiểu Việt Nam", () => {
    expect(phanTram(0.105)).toBe("10,5%");
    expect(phanTram(0.005)).toBe("0,5%");
    expect(phanTram(0.215)).toBe("21,5%");
    expect(phanTram(0)).toBe("0%");
  });

  it("không phải số → undefined (để câu chữ bỏ con số, không in 'NaN%')", () => {
    expect(phanTram(undefined)).toBeUndefined();
    expect(phanTram(NaN)).toBeUndefined();
  });
});

describe("dienGiaiThueVaBaoHiem — thứ tự ưu tiên khớp engine", () => {
  it("không cờ nào → lũy tiến có giảm trừ", () => {
    expect(dienGiaiThueVaBaoHiem({}, CAU_HINH).thue).toContain(
      "có giảm trừ bản thân"
    );
  });

  it("camKet thắng tất cả", () => {
    const co = { camKet: true, thoiVu: true, hopDongThu2: true };
    expect(dienGiaiThueVaBaoHiem(co, CAU_HINH).thue).toContain(
      "Không khấu trừ thuế"
    );
  });

  it("thoiVu thắng hopDongThu2", () => {
    const r = dienGiaiThueVaBaoHiem({ thoiVu: true, hopDongThu2: true }, CAU_HINH);
    expect(r.thue).toContain("Khấu trừ thẳng 10%");
    expect(r.thue).not.toContain("lũy tiến");
  });

  it("hopDongThu2 một mình → lũy tiến nhưng không giảm trừ", () => {
    const r = dienGiaiThueVaBaoHiem({ hopDongThu2: true }, CAU_HINH);
    expect(r.thue).toContain("lũy tiến");
    expect(r.thue).toContain("không giảm trừ gia cảnh");
  });
});

describe("dienGiaiThueVaBaoHiem — phần bảo hiểm", () => {
  it("HĐ thứ 2 → nêu đúng tỷ lệ công ty đóng, bất kể dongBH", () => {
    for (const dongBH of [true, false]) {
      const r = dienGiaiThueVaBaoHiem({ hopDongThu2: true, dongBH }, CAU_HINH);
      expect(r.baoHiem).toContain("0,5%");
      expect(r.baoHiem).toContain("không bị trừ bảo hiểm");
    }
  });

  it("có đóng BH, HĐ thường → nêu cả phần NV và phần công ty", () => {
    const r = dienGiaiThueVaBaoHiem({ dongBH: true }, CAU_HINH);
    expect(r.baoHiem).toContain("10,5%");
    expect(r.baoHiem).toContain("21,5%");
  });

  it("không đóng BH → nói rõ là không đóng", () => {
    expect(dienGiaiThueVaBaoHiem({}, CAU_HINH).baoHiem).toBe(
      "Không đóng bảo hiểm ở công ty này."
    );
  });
});

describe("dienGiaiThueVaBaoHiem — chưa tải được cấu hình", () => {
  it("vẫn diễn giải được, chỉ bỏ con số (không in 'undefined%')", () => {
    const r = dienGiaiThueVaBaoHiem({ dongBH: true, thoiVu: true }, null);

    expect(r.thue).toContain("hợp đồng thời vụ");
    expect(r.baoHiem).toContain("phần bảo hiểm của nhân viên");
    expect(`${r.thue} ${r.baoHiem}`).not.toContain("undefined");
    expect(`${r.thue} ${r.baoHiem}`).not.toContain("NaN");
  });

  it("tỷ lệ đổi ở Cấu hình lương thì câu chữ đổi theo (không viết cứng)", () => {
    const khac = {
      ...CAU_HINH,
      bhCongTy: { tyLe: 0.3, tyLeHopDongThu2: 0.007 },
    } as unknown as CauHinhLuong;

    expect(
      dienGiaiThueVaBaoHiem({ hopDongThu2: true }, khac).baoHiem
    ).toContain("0,7%");
    expect(dienGiaiThueVaBaoHiem({ dongBH: true }, khac).baoHiem).toContain(
      "30%"
    );
  });
});
