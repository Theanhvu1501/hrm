import { useState, useMemo } from 'react';
import { Select, DatePicker, Button } from 'antd';
import dayjs from 'dayjs';
import { FilterBar } from '@/components/common/FilterBar';
import type { KqkdPeriodType } from '@/services/kqkdService';

export interface KqkdFilterParams {
  periodType: KqkdPeriodType;
  startDate: string;
  endDate: string;
}

interface KqkdFilterProps {
  onFilter: (params: KqkdFilterParams) => void;
  loading?: boolean;
}

const PERIOD_OPTIONS = [
  { value: 'thang', label: 'Tháng' },
  { value: 'quy', label: 'Quý' },
  { value: 'nam', label: 'Năm' },
  { value: 'tuyChon', label: 'Tùy chọn' },
];

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Tháng ${i + 1}`,
}));

const QUARTERS = [
  { value: '1', label: 'Quý 1 (T1-T3)' },
  { value: '2', label: 'Quý 2 (T4-T6)' },
  { value: '3', label: 'Quý 3 (T7-T9)' },
  { value: '4', label: 'Quý 4 (T10-T12)' },
];

function getYearOptions(): { value: string; label: string }[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - i;
    return { value: String(y), label: String(y) };
  });
}

function buildDateRange(
  periodType: KqkdPeriodType,
  month: number,
  quarter: number,
  year: number,
  customFrom: string,
  customTo: string,
): { startDate: string; endDate: string } {
  switch (periodType) {
    case 'thang': {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    case 'quy': {
      const qStart = (quarter - 1) * 3;
      const start = new Date(year, qStart, 1);
      const end = new Date(year, qStart + 3, 0);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    case 'nam': {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    case 'tuyChon':
      return {
        startDate: new Date(customFrom).toISOString(),
        endDate: new Date(customTo).toISOString(),
      };
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export function KqkdFilter({ onFilter, loading }: KqkdFilterProps) {
  const now = new Date();
  const [periodType, setPeriodType] = useState<KqkdPeriodType>('thang');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [customFrom, setCustomFrom] = useState(now.toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState(now.toISOString().slice(0, 10));

  const yearOptions = useMemo(() => getYearOptions(), []);

  const handleSubmit = () => {
    const range = buildDateRange(periodType, month, quarter, year, customFrom, customTo);
    onFilter({ periodType, ...range });
  };

  const yearField = (
    <Field label="Năm">
      <Select
        value={String(year)}
        onChange={(v) => setYear(Number(v))}
        options={yearOptions}
        style={{ width: 100 }}
      />
    </Field>
  );

  return (
    <FilterBar
      filters={
        <>
          <Field label="Kỳ báo cáo">
            <Select
              value={periodType}
              onChange={(v) => setPeriodType(v as KqkdPeriodType)}
              options={PERIOD_OPTIONS}
              style={{ width: 140 }}
            />
          </Field>

          {periodType === 'thang' && (
            <>
              <Field label="Tháng">
                <Select
                  value={String(month)}
                  onChange={(v) => setMonth(Number(v))}
                  options={MONTHS}
                  style={{ width: 120 }}
                />
              </Field>
              {yearField}
            </>
          )}

          {periodType === 'quy' && (
            <>
              <Field label="Quý">
                <Select
                  value={String(quarter)}
                  onChange={(v) => setQuarter(Number(v))}
                  options={QUARTERS}
                  style={{ width: 150 }}
                />
              </Field>
              {yearField}
            </>
          )}

          {periodType === 'nam' && yearField}

          {periodType === 'tuyChon' && (
            <>
              <Field label="Từ ngày">
                <DatePicker
                  format="DD/MM/YYYY"
                  value={customFrom ? dayjs(customFrom) : null}
                  onChange={(d) => setCustomFrom(d ? d.format('YYYY-MM-DD') : '')}
                  style={{ width: 160 }}
                />
              </Field>
              <Field label="Đến ngày">
                <DatePicker
                  format="DD/MM/YYYY"
                  value={customTo ? dayjs(customTo) : null}
                  onChange={(d) => setCustomTo(d ? d.format('YYYY-MM-DD') : '')}
                  style={{ width: 160 }}
                />
              </Field>
            </>
          )}
        </>
      }
      actions={
        <Button type="primary" onClick={handleSubmit} loading={loading}>
          Xem báo cáo
        </Button>
      }
    />
  );
}
