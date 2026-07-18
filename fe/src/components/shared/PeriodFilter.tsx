import { useState } from 'react';
import { Select, DatePicker, Button, Space } from 'antd';
import { SearchOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';

export type PeriodType = 'ngay' | 'thang' | 'quy' | 'nam' | 'tuyChon';

export interface PeriodFilterParams {
  periodType: PeriodType;
  startDate: string;
  endDate: string;
}

interface PeriodFilterProps {
  onFilter: (params: PeriodFilterParams) => void;
  loading?: boolean;
  /** Bật: đổi kiểu xem / ngày là query ngay và ẩn nút "Xem báo cáo". */
  autoApply?: boolean;
  /** Kỳ chọn sẵn lúc mở trang (vd 'thang7', 'tuyChon'). Mặc định 'namNay'. */
  defaultPeriod?: string;
  /** Khoảng ngày điền sẵn khi defaultPeriod = 'tuyChon'. */
  defaultCustomRange?: [Dayjs, Dayjs];
}

const CURRENT_YEAR = new Date().getFullYear();

const PERIOD_OPTIONS = [
  ...Array.from({ length: 12 }, (_, i) => ({ value: `thang${i + 1}`, label: `Tháng ${i + 1}` })),
  { value: 'nuaDau', label: '6 tháng đầu năm' },
  { value: 'nuaCuoi', label: '6 tháng cuối năm' },
  { value: 'namNay', label: 'Năm nay' },
  { value: 'namTruoc', label: 'Năm trước' },
  { value: 'tuyChon', label: 'Tùy chọn' },
];

/** Mặc định: Năm nay. Dùng cho khởi tạo state ở trang dùng filter. */
export function defaultYearParams(): PeriodFilterParams {
  return {
    periodType: 'nam',
    startDate: new Date(CURRENT_YEAR, 0, 1).toISOString(),
    endDate: new Date(CURRENT_YEAR, 11, 31, 23, 59, 59, 999).toISOString(),
  };
}

/** Key kỳ của tháng hiện tại — dùng cho trang muốn mặc định "tháng này". */
export function currentMonthPeriod(): string {
  return `thang${new Date().getMonth() + 1}`;
}

/** Khoảng ngày của một kỳ trong danh sách. Trang dùng để tính state khởi tạo. */
export function paramsOfPeriod(period: string): PeriodFilterParams {
  if (period.startsWith('thang')) {
    const m = Number(period.slice(5));
    return {
      periodType: 'thang',
      startDate: new Date(CURRENT_YEAR, m - 1, 1).toISOString(),
      endDate: new Date(CURRENT_YEAR, m, 0, 23, 59, 59, 999).toISOString(),
    };
  }
  switch (period) {
    case 'nuaDau':
      return {
        periodType: 'tuyChon',
        startDate: new Date(CURRENT_YEAR, 0, 1).toISOString(),
        endDate: new Date(CURRENT_YEAR, 6, 0, 23, 59, 59, 999).toISOString(),
      };
    case 'nuaCuoi':
      return {
        periodType: 'tuyChon',
        startDate: new Date(CURRENT_YEAR, 6, 1).toISOString(),
        endDate: new Date(CURRENT_YEAR, 12, 0, 23, 59, 59, 999).toISOString(),
      };
    case 'namTruoc':
      return {
        periodType: 'nam',
        startDate: new Date(CURRENT_YEAR - 1, 0, 1).toISOString(),
        endDate: new Date(CURRENT_YEAR - 1, 11, 31, 23, 59, 59, 999).toISOString(),
      };
    case 'namNay':
    default:
      return defaultYearParams();
  }
}

export function PeriodFilter({
  onFilter,
  loading,
  autoApply,
  defaultPeriod,
  defaultCustomRange,
}: PeriodFilterProps) {
  const [period, setPeriod] = useState(defaultPeriod ?? 'namNay');
  const [customFrom, setCustomFrom] = useState<Dayjs | null>(
    defaultCustomRange?.[0] ?? dayjs().startOf('month'),
  );
  const [customTo, setCustomTo] = useState<Dayjs | null>(defaultCustomRange?.[1] ?? dayjs());
  const isCustom = period === 'tuyChon';

  const emitCustom = (from: Dayjs | null, to: Dayjs | null) => {
    if (!from || !to) return;
    onFilter({
      periodType: 'tuyChon',
      startDate: from.startOf('day').toISOString(),
      endDate: to.endOf('day').toISOString(),
    });
  };

  const handleSubmit = () => {
    if (isCustom) emitCustom(customFrom, customTo);
    else onFilter(paramsOfPeriod(period));
  };

  const handlePeriodChange = (val: string) => {
    setPeriod(val);
    if (!autoApply) return;
    if (val === 'tuyChon') emitCustom(customFrom, customTo);
    else onFilter(paramsOfPeriod(val));
  };

  const handleFromChange = (d: Dayjs | null) => {
    setCustomFrom(d);
    if (autoApply) emitCustom(d, customTo);
  };
  const handleToChange = (d: Dayjs | null) => {
    setCustomTo(d);
    if (autoApply) emitCustom(customFrom, d);
  };

  return (
    <Space align="center" size="small" wrap>
      <CalendarOutlined style={{ color: '#1890ff' }} />
      <Select
        value={period}
        onChange={handlePeriodChange}
        options={PERIOD_OPTIONS}
        style={{ width: 160 }}
        showSearch
        optionFilterProp="label"
      />
      {isCustom && (
        <>
          <DatePicker value={customFrom} onChange={handleFromChange} placeholder="Từ ngày" format="DD/MM/YYYY" style={{ width: 140 }} />
          <DatePicker value={customTo} onChange={handleToChange} placeholder="Đến ngày" format="DD/MM/YYYY" style={{ width: 140 }} />
        </>
      )}
      {!autoApply && (
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSubmit} loading={loading}>
          Xem báo cáo
        </Button>
      )}
    </Space>
  );
}
