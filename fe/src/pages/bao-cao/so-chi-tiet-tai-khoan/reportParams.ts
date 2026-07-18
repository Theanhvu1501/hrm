import dayjs, { type Dayjs } from 'dayjs';
import { currentMonthPeriod, paramsOfPeriod } from '@/components/shared/PeriodFilter';

export interface ParsedReportParams {
  maTaiKhoan?: string;
  maDoiTuong?: string;
  startDate?: string; // ISO
  endDate?: string; // ISO
}

/**
 * Trích tham số mở sổ chi tiết từ query string.
 * `get` là getter thuần (vd searchParams.get) để dễ test.
 * Chỉ trả về các key có giá trị (không rỗng).
 */
export function parseReportParams(
  get: (key: string) => string | null,
): ParsedReportParams {
  const result: ParsedReportParams = {};
  const maTaiKhoan = get('maTaiKhoan');
  const maDoiTuong = get('maDoiTuong');
  const startDate = get('startDate');
  const endDate = get('endDate');
  if (maTaiKhoan) result.maTaiKhoan = maTaiKhoan;
  if (maDoiTuong) result.maDoiTuong = maDoiTuong;
  if (startDate) result.startDate = startDate;
  if (endDate) result.endDate = endDate;
  return result;
}

export interface InitialPeriod {
  /** Kỳ hiện trên dropdown lúc mở trang. */
  period: string;
  /** Khoảng ngày trang dùng để gọi API. */
  range: [Dayjs, Dayjs];
  /** Chỉ có khi mở từ link drill-down (period = 'tuyChon'). */
  customRange?: [Dayjs, Dayjs];
}

/**
 * Kỳ khởi tạo của trang Sổ chi tiết.
 * Mở từ link drill-down (có startDate/endDate hợp lệ) → "Tùy chọn" + đúng khoảng ngày của link,
 * để dropdown khớp với dữ liệu đang xem. Còn lại → tháng hiện tại.
 */
export function initialPeriod(get: (key: string) => string | null): InitialPeriod {
  const { startDate, endDate } = parseReportParams(get);
  const start = startDate ? dayjs(startDate) : null;
  const end = endDate ? dayjs(endDate) : null;

  if (start?.isValid() && end?.isValid()) {
    return { period: 'tuyChon', range: [start, end], customRange: [start, end] };
  }

  const period = currentMonthPeriod();
  const p = paramsOfPeriod(period);
  return { period, range: [dayjs(p.startDate), dayjs(p.endDate)] };
}
