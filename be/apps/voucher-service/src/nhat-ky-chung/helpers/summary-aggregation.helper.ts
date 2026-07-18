import { SummaryType } from '../dto';

/**
 * Map summary type to danhMuc field path
 * Note: investor (chuDauTu) is nested inside duAn
 */
const SUMMARY_FIELD_MAP: Record<SummaryType, string> = {
  account: 'taiKhoanNo', // Special handling for account
  team: 'doi',
  employee: 'nhanVien',
  project: 'duAn',
  investor: 'duAn.chuDauTu', // chuDauTu is nested inside duAn
  product: 'sanPham',
  'cash-flow': 'dongTien',
  'management-group': 'nhomQuanLy',
  'promotion-group': 'nhomKhuyenMai',
};

/**
 * Build MongoDB aggregation pipeline for summary by type
 */
export function buildSummaryAggregation(
  type: SummaryType,
  mongoQuery: Record<string, unknown>,
): object[] {
  const field = SUMMARY_FIELD_MAP[type];

  // Special handling for account summary (combines taiKhoanNo and taiKhoanCo)
  if (type === 'account') {
    return buildAccountSummaryAggregation(mongoQuery);
  }

  // Special handling for investor (chuDauTu is nested inside duAn)
  if (type === 'investor') {
    return buildInvestorSummaryAggregation(mongoQuery);
  }

  const fieldPath = `$danhMuc.${field}`;

  return [
    { $match: mongoQuery },
    {
      $group: {
        _id: `${fieldPath}.ma`,
        ten: { $first: `${fieldPath}.ten` },
        phatSinhNo: {
          $sum: {
            $cond: [{ $eq: ['$loai', 'PHIEU_THU'] }, '$soTien', 0],
          },
        },
        phatSinhCo: {
          $sum: {
            $cond: [{ $eq: ['$loai', 'PHIEU_CHI'] }, '$soTien', 0],
          },
        },
        soLuong: { $sum: 1 },
      },
    },
    { $match: { _id: { $ne: null } } },
    {
      $project: {
        _id: 0,
        key: '$_id',
        ten: 1,
        phatSinhNo: 1,
        phatSinhCo: 1,
        soLuong: 1,
      },
    },
    { $sort: { soLuong: -1 } },
  ];
}

/**
 * Build aggregation for investor (chuDauTu) summary
 * chuDauTu can be in two places:
 * 1. danhMuc.chuDauTu.ma/ten (separate field)
 * 2. danhMuc.duAn.chuDauTuMa/chuDauTuTen (nested in duAn)
 * We need to handle both cases
 */
function buildInvestorSummaryAggregation(
  mongoQuery: Record<string, unknown>,
): object[] {
  return [
    { $match: mongoQuery },
    {
      // Add computed field that gets chuDauTu from either location
      $addFields: {
        computedChuDauTuMa: {
          $ifNull: ['$danhMuc.chuDauTu.ma', '$danhMuc.duAn.chuDauTuMa'],
        },
        computedChuDauTuTen: {
          $ifNull: ['$danhMuc.chuDauTu.ten', '$danhMuc.duAn.chuDauTuTen'],
        },
      },
    },
    {
      $group: {
        _id: '$computedChuDauTuMa',
        ten: { $first: '$computedChuDauTuTen' },
        phatSinhNo: {
          $sum: {
            $cond: [{ $eq: ['$loai', 'PHIEU_THU'] }, '$soTien', 0],
          },
        },
        phatSinhCo: {
          $sum: {
            $cond: [{ $eq: ['$loai', 'PHIEU_CHI'] }, '$soTien', 0],
          },
        },
        soLuong: { $sum: 1 },
      },
    },
    { $match: { _id: { $ne: null } } },
    {
      $project: {
        _id: 0,
        key: '$_id',
        ten: 1,
        phatSinhNo: 1,
        phatSinhCo: 1,
        soLuong: 1,
      },
    },
    { $sort: { soLuong: -1 } },
  ];
}

/**
 * Build aggregation for account summary
 * This combines both taiKhoanNo (debit) and taiKhoanCo (credit) accounts
 */
function buildAccountSummaryAggregation(
  mongoQuery: Record<string, unknown>,
): object[] {
  return [
    { $match: mongoQuery },
    {
      $facet: {
        // Group by taiKhoanNo (debit accounts)
        debitAccounts: [
          { $match: { 'danhMuc.taiKhoanNo.ma': { $ne: null } } },
          {
            $group: {
              _id: '$danhMuc.taiKhoanNo.ma',
              ten: { $first: '$danhMuc.taiKhoanNo.ten' },
              phatSinhNo: { $sum: '$soTien' },
              phatSinhCo: { $sum: 0 },
              soLuong: { $sum: 1 },
            },
          },
        ],
        // Group by taiKhoanCo (credit accounts)
        creditAccounts: [
          { $match: { 'danhMuc.taiKhoanCo.ma': { $ne: null } } },
          {
            $group: {
              _id: '$danhMuc.taiKhoanCo.ma',
              ten: { $first: '$danhMuc.taiKhoanCo.ten' },
              phatSinhNo: { $sum: 0 },
              phatSinhCo: { $sum: '$soTien' },
              soLuong: { $sum: 1 },
            },
          },
        ],
      },
    },
    // Combine both arrays
    {
      $project: {
        combined: { $concatArrays: ['$debitAccounts', '$creditAccounts'] },
      },
    },
    { $unwind: '$combined' },
    { $replaceRoot: { newRoot: '$combined' } },
    // Merge same accounts
    {
      $group: {
        _id: '$_id',
        ten: { $first: '$ten' },
        phatSinhNo: { $sum: '$phatSinhNo' },
        phatSinhCo: { $sum: '$phatSinhCo' },
        soLuong: { $sum: '$soLuong' },
      },
    },
    { $match: { _id: { $ne: null } } },
    {
      $project: {
        _id: 0,
        key: '$_id',
        ten: 1,
        phatSinhNo: 1,
        phatSinhCo: 1,
        soLuong: 1,
      },
    },
    { $sort: { key: 1 } },
  ];
}

/**
 * Get the danhMuc field name for a summary type
 */
export function getSummaryFieldName(type: SummaryType): string {
  return SUMMARY_FIELD_MAP[type];
}
