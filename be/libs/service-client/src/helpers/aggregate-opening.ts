export interface OpeningItemInput {
  maTaiKhoan: string;
  duNo: number | string;
  duCo: number | string;
  [key: string]: unknown;
}

export interface OpeningItemAggregated {
  maTaiKhoan: string;
  duNo: number;
  duCo: number;
}

/**
 * Gop cac dong so du dau ky chi tiet ve tong theo ma tai khoan.
 * Reporting chi can tong theo TK nen bo cac field chi tiet.
 */
export function aggregateOpeningByAccount(
  items: OpeningItemInput[],
): OpeningItemAggregated[] {
  const map = new Map<string, OpeningItemAggregated>();
  for (const it of items || []) {
    const ma = it.maTaiKhoan;
    const cur = map.get(ma) ?? { maTaiKhoan: ma, duNo: 0, duCo: 0 };
    cur.duNo += Number(it.duNo) || 0;
    cur.duCo += Number(it.duCo) || 0;
    map.set(ma, cur);
  }
  return Array.from(map.values());
}
