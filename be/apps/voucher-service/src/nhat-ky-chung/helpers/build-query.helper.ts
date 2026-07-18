import { NhatKyChungQueryDto } from '../dto';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildMongoQuery(
  query: NhatKyChungQueryDto,
): Record<string, unknown> {
  const { search, startDate, endDate, loai, doiTuong, duAn, boPhan, taiKhoanNo, taiKhoanCo } = query;
  const mongoQuery: Record<string, unknown> = {};

  // Filter by loai (loại giao dịch - stored in danhMuc.loaiGiaoDich.ma)
  if (loai) {
    mongoQuery['danhMuc.loaiGiaoDich.ma'] = loai;
  }

  // Filter by date range
  if (startDate || endDate) {
    mongoQuery.ngay = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      (mongoQuery.ngay as Record<string, Date>).$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (mongoQuery.ngay as Record<string, Date>).$lte = end;
    }
  }

  // search và doiTuong đều là điều kiện $or, nên gom qua $and để không ghi đè nhau
  const orConditions: Record<string, unknown>[][] = [];

  // Search by regex on nghiepVu, nội dung, số phiếu và đối tượng
  // doiTuong2 giữ "đối tượng có"; dữ liệu cũ chỉ có doiTuong
  if (search) {
    const escaped = escapeRegex(search);
    orConditions.push([
      { 'danhMuc.nghiepVu.ten': { $regex: escaped, $options: 'i' } },
      { 'danhMuc.nghiepVu.ma': { $regex: escaped, $options: 'i' } },
      { noiDung: { $regex: escaped, $options: 'i' } },
      { soPhieu: { $regex: escaped, $options: 'i' } },
      { 'danhMuc.doiTuong.ma': { $regex: escaped, $options: 'i' } },
      { 'danhMuc.doiTuong.ten': { $regex: escaped, $options: 'i' } },
      { 'danhMuc.doiTuong2.ma': { $regex: escaped, $options: 'i' } },
      { 'danhMuc.doiTuong2.ten': { $regex: escaped, $options: 'i' } },
    ]);
  }

  // Filter by đối tượng — khớp đối tượng bên Nợ hoặc bên Có
  if (doiTuong) {
    orConditions.push([
      { 'danhMuc.doiTuong.ma': doiTuong },
      { 'danhMuc.doiTuong2.ma': doiTuong },
    ]);
  }

  if (orConditions.length === 1) {
    mongoQuery.$or = orConditions[0];
  } else if (orConditions.length > 1) {
    mongoQuery.$and = orConditions.map((conditions) => ({ $or: conditions }));
  }

  // Filter by dự án
  if (duAn) {
    mongoQuery['danhMuc.duAn.ma'] = duAn;
  }

  // Filter by bộ phận
  if (boPhan) {
    mongoQuery['danhMuc.boPhan.ma'] = boPhan;
  }

  // Filter by tài khoản nợ
  if (taiKhoanNo) {
    mongoQuery['danhMuc.taiKhoanNo.ma'] = taiKhoanNo;
  }

  // Filter by tài khoản có
  if (taiKhoanCo) {
    mongoQuery['danhMuc.taiKhoanCo.ma'] = taiKhoanCo;
  }

  return mongoQuery;
}
