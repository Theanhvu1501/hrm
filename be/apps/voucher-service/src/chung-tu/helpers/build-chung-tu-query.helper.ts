import type { LoaiChungTu } from '@app/entities';
import { ChungTuQueryDto } from '../dto/chung-tu-query.dto';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildChungTuMongoQuery(
  loai: LoaiChungTu,
  query: ChungTuQueryDto,
): Record<string, unknown> {
  const { search, startDate, endDate, doiTuong, duAn, boPhan, taiKhoanNo, taiKhoanCo } = query;
  const q: Record<string, unknown> = { loai };

  if (startDate || endDate) {
    const ngay: Record<string, Date> = {};
    if (startDate) { const s = new Date(startDate); s.setHours(0, 0, 0, 0); ngay.$gte = s; }
    if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); ngay.$lte = e; }
    q.ngay = ngay;
  }
  if (search) {
    const esc = escapeRegex(search);
    q.$or = [
      { noiDung: { $regex: esc, $options: 'i' } },
      { soPhieu: { $regex: esc, $options: 'i' } },
      { 'danhMuc.doiTuong.ten': { $regex: esc, $options: 'i' } },
    ];
  }
  if (doiTuong) q['danhMuc.doiTuong.ma'] = doiTuong;
  if (duAn) q['danhMuc.duAn.ma'] = duAn;
  if (boPhan) q['danhMuc.boPhan.ma'] = boPhan;
  if (taiKhoanNo) q['danhMuc.taiKhoanNo.ma'] = taiKhoanNo;
  if (taiKhoanCo) q['danhMuc.taiKhoanCo.ma'] = taiKhoanCo;
  return q;
}
