export interface AutoRow {
  quy: number;
  nhom: number;
  soTien: number;
}

export interface CpKhongTruResult {
  perQuy: number[][];
  tongPerQuy: number[];
}

const FIELD_BY_NHOM = [
  'cpkdtDichVuHangHoa', // nhóm 1
  'cpkdtTscdCcdc', // nhóm 2
  'cpkdtNhanCong', // nhóm 3
  'cpkdtTaiChinhKhac', // nhóm 4
];

/**
 * Gộp chi phí không được trừ theo quý + nhóm:
 * perQuy[q][n] = tổng auto (quý q, nhóm n) + điều chỉnh tay (field tương ứng nhóm n, quý q).
 * tongPerQuy[q] = tổng 4 nhóm trong quý q.
 */
export function buildCpKhongTru(
  autoRows: AutoRow[],
  dieuChinh: Record<string, number[]>,
): CpKhongTruResult {
  // perQuy[q][n] với q,n = 0..3
  const perQuy = [0, 1, 2, 3].map(() => [0, 0, 0, 0]);
  for (const row of autoRows || []) {
    const q = (row.quy || 1) - 1;
    const n = (row.nhom || 4) - 1;
    if (q < 0 || q > 3 || n < 0 || n > 3) continue;
    perQuy[q][n] += row.soTien || 0;
  }
  // cộng điều chỉnh tay
  FIELD_BY_NHOM.forEach((field, n) => {
    const arr = dieuChinh?.[field] || [0, 0, 0, 0];
    for (let q = 0; q < 4; q++) perQuy[q][n] += Number(arr[q]) || 0;
  });
  const tongPerQuy = perQuy.map((nhomArr) =>
    nhomArr.reduce((a, b) => a + b, 0),
  );
  return { perQuy, tongPerQuy };
}
