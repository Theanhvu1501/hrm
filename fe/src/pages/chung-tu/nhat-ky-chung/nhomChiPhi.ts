export type NhomChiPhi = 1 | 2 | 3 | 4;

// Ưu tiên khớp tiền tố dài nhất; không khớp → nhóm 4.
const PREFIX_RULES: { prefix: string; nhom: NhomChiPhi }[] = [
  { prefix: "632", nhom: 1 }, { prefix: "154", nhom: 1 }, { prefix: "156", nhom: 1 },
  { prefix: "152", nhom: 1 }, { prefix: "611", nhom: 1 },
  { prefix: "211", nhom: 2 }, { prefix: "213", nhom: 2 }, { prefix: "214", nhom: 2 },
  { prefix: "242", nhom: 2 }, { prefix: "153", nhom: 2 },
  { prefix: "3341", nhom: 3 }, { prefix: "3383", nhom: 3 }, { prefix: "3384", nhom: 3 },
  { prefix: "3386", nhom: 3 }, { prefix: "334", nhom: 3 }, { prefix: "338", nhom: 3 },
  { prefix: "622", nhom: 3 },
  { prefix: "635", nhom: 4 }, { prefix: "811", nhom: 4 }, { prefix: "641", nhom: 4 },
  { prefix: "642", nhom: 4 },
];

export function suggestNhomChiPhi(taiKhoanNo?: string): NhomChiPhi {
  if (!taiKhoanNo) return 4;
  const tk = taiKhoanNo.trim();
  const matches = PREFIX_RULES.filter((r) => tk.startsWith(r.prefix));
  if (!matches.length) return 4;
  matches.sort((a, b) => b.prefix.length - a.prefix.length);
  return matches[0].nhom;
}
