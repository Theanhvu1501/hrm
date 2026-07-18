import { describe, it, expect } from "vitest";
import { suggestNhomChiPhi } from "./nhomChiPhi";

describe("suggestNhomChiPhi", () => {
  it("632/154/156 → nhóm 1", () => {
    expect(suggestNhomChiPhi("632")).toBe(1);
    expect(suggestNhomChiPhi("1561")).toBe(1);
  });
  it("211/242/153 → nhóm 2", () => {
    expect(suggestNhomChiPhi("2111")).toBe(2);
    expect(suggestNhomChiPhi("242")).toBe(2);
  });
  it("334/3383/622 → nhóm 3", () => {
    expect(suggestNhomChiPhi("3341")).toBe(3);
    expect(suggestNhomChiPhi("3383")).toBe(3);
  });
  it("635/811/641/642 → nhóm 4", () => {
    expect(suggestNhomChiPhi("6428")).toBe(4);
    expect(suggestNhomChiPhi("811")).toBe(4);
  });
  it("không khớp → mặc định nhóm 4", () => {
    expect(suggestNhomChiPhi("131")).toBe(4);
    expect(suggestNhomChiPhi(undefined)).toBe(4);
  });
});
