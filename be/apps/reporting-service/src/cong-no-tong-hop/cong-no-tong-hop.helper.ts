import {
  buildDoiTuongRows,
  DoiTuongAgg,
  DoiTuongOpening,
} from '../so-cai/so-cai.service';
import {
  AccountInfo,
  DtAggInput,
  DtOpeningInput,
  CongNoFilters,
  CongNoDoiTuongRow,
  CongNoAccount,
  CongNoRowVal,
  CongNoCell,
  BangTongHopCongNo,
  CONG_NO_CHI_TIET_TYPES,
} from './cong-no-tong-hop.types';
import {
  matchLoaiBySnapshot,
  type LoaiMatcher,
} from '../shared/doi-tuong-loai.helper';

const zeroCell = (): CongNoCell => ({ phaiThu: 0, phaiTra: 0 });
const zeroVal = (): CongNoRowVal => ({
  dauKy: zeroCell(),
  phatSinh: zeroCell(),
  cuoiKy: zeroCell(),
});

function addInto(target: CongNoRowVal, src: CongNoRowVal): void {
  target.dauKy.phaiThu += src.dauKy.phaiThu;
  target.dauKy.phaiTra += src.dauKy.phaiTra;
  target.phatSinh.phaiThu += src.phatSinh.phaiThu;
  target.phatSinh.phaiTra += src.phatSinh.phaiTra;
  target.cuoiKy.phaiThu += src.cuoiKy.phaiThu;
  target.cuoiKy.phaiTra += src.cuoiKy.phaiTra;
}

/**
 * Dựng Bảng tổng hợp công nợ từ dữ liệu đã tổng hợp theo (TK, đối tượng).
 * Tái dụng buildDoiTuongRows (đã test) để tính đầu/phát sinh/cuối kỳ Nợ/Có,
 * rồi map Nợ→Phải thu, Có→Phải trả. Tổng TK = Σ đối tượng (KHÔNG bù trừ).
 */
export function buildCongNoReport(
  accounts: AccountInfo[],
  dtAgg: DtAggInput[],
  dtOpening: DtOpeningInput[],
  filters: CongNoFilters,
  match: LoaiMatcher = matchLoaiBySnapshot,
): BangTongHopCongNo {
  // Gom đối tượng-agg theo mã TK
  const aggByAcc = new Map<string, DoiTuongAgg[]>();
  for (const d of dtAgg) {
    const arr = aggByAcc.get(d.ma) ?? [];
    arr.push({
      doiTuongMa: d.doiTuongMa,
      doiTuongTen: d.doiTuongTen,
      doiTuongLoai: d.doiTuongLoai,
      priorNo: d.priorNo,
      priorCo: d.priorCo,
      periodNo: d.periodNo,
      periodCo: d.periodCo,
    });
    aggByAcc.set(d.ma, arr);
  }

  // Gom opening theo mã TK
  const openByAcc = new Map<string, DoiTuongOpening[]>();
  for (const o of dtOpening) {
    const arr = openByAcc.get(o.maTaiKhoan) ?? [];
    arr.push({
      doiTuongMa: o.chiTietMa,
      doiTuongTen: o.chiTietTen,
      chiTietType: o.chiTietType,
      duNo: Number(o.duNo) || 0,
      duCo: Number(o.duCo) || 0,
    });
    openByAcc.set(o.maTaiKhoan, arr);
  }

  const congNoAccounts = accounts.filter(
    (a) =>
      a.chiTietTheo &&
      CONG_NO_CHI_TIET_TYPES.has(a.chiTietTheo) &&
      (!filters.maTaiKhoan || a.ma === filters.maTaiKhoan),
  );

  const result: CongNoAccount[] = [];
  const totals = zeroVal();

  for (const acc of congNoAccounts) {
    const rows = buildDoiTuongRows(
      acc.loai,
      aggByAcc.get(acc.ma) ?? [],
      openByAcc.get(acc.ma) ?? [],
      acc.chiTietTheo!,
      match,
    );

    let doiTuongs: CongNoDoiTuongRow[] = rows.map((row) => ({
      ma: row.ma,
      ten: row.ten,
      dauKy: { phaiThu: row.noDauKy, phaiTra: row.coDauKy },
      phatSinh: { phaiThu: row.noPhatSinh, phaiTra: row.coPhatSinh },
      cuoiKy: { phaiThu: row.noCuoiKy, phaiTra: row.coCuoiKy },
    }));

    if (filters.maDoiTuong) {
      doiTuongs = doiTuongs.filter((d) => d.ma === filters.maDoiTuong);
    }
    if (doiTuongs.length === 0) continue;

    const subtotal = zeroVal();
    for (const d of doiTuongs) addInto(subtotal, d);

    result.push({ ma: acc.ma, ten: acc.ten, ...subtotal, doiTuongs });
    addInto(totals, subtotal);
  }

  result.sort((a, b) => a.ma.localeCompare(b.ma));
  return { accounts: result, totals };
}
