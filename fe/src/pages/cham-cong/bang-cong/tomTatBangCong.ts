import type { Timesheet } from '@/services/timesheetService';

export interface TomTatThang {
  soOTrong: number;
  soOCanhBao: number;
  coTheChot: boolean;
  lyDoKhongChot: string;
}

/**
 * Dùng `??` chứ không `||`: 0 là giá trị hợp lệ và là giá trị TỐT nhất ở đây
 * (không còn ô nào phải xử lý).
 */
export function tomTatThang(rows: Timesheet[]): TomTatThang {
  const soOTrong = rows.reduce((s, r) => s + (r.soOTrong ?? 0), 0);
  const soOCanhBao = rows.reduce((s, r) => s + (r.soOCanhBao ?? 0), 0);

  if (rows.length === 0) {
    return { soOTrong, soOCanhBao, coTheChot: false, lyDoKhongChot: 'Chưa có bảng công nào để chốt' };
  }

  return {
    soOTrong,
    soOCanhBao,
    coTheChot: soOTrong === 0,
    lyDoKhongChot: soOTrong === 0 ? '' : `Còn ${soOTrong} ô chưa xử lý`,
  };
}
