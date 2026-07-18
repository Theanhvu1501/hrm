/**
 * Đọc số tiền (VND) thành chữ tiếng Việt, viết hoa chữ đầu, đuôi " đồng".
 * Dùng cho phiếu thu/chi (Mẫu 01-TT / 02-TT).
 */

const CHU_SO = [
  "không",
  "một",
  "hai",
  "ba",
  "bốn",
  "năm",
  "sáu",
  "bảy",
  "tám",
  "chín",
];

/** Đọc một nhóm 3 chữ số. `full` = đọc đủ cả "trăm"/"lẻ" (cho nhóm không phải nhóm cao nhất). */
function docBaChuSo(baSo: number, full: boolean): string {
  const tram = Math.floor(baSo / 100);
  const chuc = Math.floor((baSo % 100) / 10);
  const donVi = baSo % 10;
  let s = "";

  if (full || tram > 0) {
    s += CHU_SO[tram] + " trăm";
    if (chuc === 0 && donVi > 0) s += " lẻ";
  }

  if (chuc > 0) {
    s += chuc === 1 ? " mười" : " " + CHU_SO[chuc] + " mươi";
  }

  if (donVi > 0) {
    if (chuc === 0) {
      s += " " + CHU_SO[donVi];
    } else if (donVi === 1 && chuc > 1) {
      s += " mốt";
    } else if (donVi === 4 && chuc > 1) {
      s += " tư";
    } else if (donVi === 5) {
      s += " lăm";
    } else {
      s += " " + CHU_SO[donVi];
    }
  }

  return s.trim();
}

/** Nhãn hàng theo vị trí nhóm (từ phải): 0→"", 1→nghìn, 2→triệu, 3→tỷ, 4→nghìn tỷ... */
function hangName(pos: number): string {
  const base = ["", "nghìn", "triệu"][pos % 3];
  const tyCount = Math.floor(pos / 3);
  const ty = Array(tyCount).fill("tỷ").join(" ");
  return [base, ty].filter(Boolean).join(" ");
}

export function docTienBangChu(n: number): string {
  let value = Math.floor(Math.abs(n || 0));
  if (value === 0) return "Không đồng";

  const groups: number[] = [];
  while (value > 0) {
    groups.unshift(value % 1000);
    value = Math.floor(value / 1000);
  }

  const len = groups.length;
  const parts: string[] = [];
  for (let i = 0; i < len; i++) {
    const g = groups[i];
    if (g === 0) continue;
    const posFromRight = len - 1 - i;
    const chunk = docBaChuSo(g, i > 0);
    parts.push([chunk, hangName(posFromRight)].filter(Boolean).join(" "));
  }

  const result = parts.join(" ").replace(/\s+/g, " ").trim();
  return result.charAt(0).toUpperCase() + result.slice(1) + " đồng";
}
