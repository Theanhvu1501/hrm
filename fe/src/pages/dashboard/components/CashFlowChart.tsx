import React, { useMemo } from 'react';
import { Card, Skeleton, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import {
  ComposedChart, Bar, Line, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { dashboardService } from '@/services/dashboardService';
import { sliceToRange } from '../period';
import { formatCurrency, DASH_COLORS } from './format';

interface Props { year: number; startMonth: number; endMonth: number; }
const TEAL = DASH_COLORS.revenue;
const GRAY = 'hsl(var(--muted-foreground) / 0.35)';
const ORANGE = '#F2994A';

const kpiTrieu = (v: number) => Math.round((v || 0) / 1e6).toLocaleString('vi-VN');
const labelTrieu = (v: number) => (v ? Math.round(v / 1e6).toLocaleString('vi-VN') : '');
const labelTrieuAbs = (v: number) => (v ? Math.round(Math.abs(v) / 1e6).toLocaleString('vi-VN') : '');

const Kpi: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="min-w-0">
    <div className="text-lg sm:text-2xl font-bold truncate" style={{ color }}>{kpiTrieu(value)}</div>
    <div className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wide truncate">{label}</div>
  </div>
);

const CashFlowChart: React.FC<Props> = ({ year, startMonth, endMonth }) => {
  const isWeekly = startMonth === endMonth;
  const month = isWeekly ? startMonth : undefined;
  const { data: full, isLoading } = useQuery({
    queryKey: ['dash-cash-series', year, month ?? 0],
    queryFn: () => dashboardService.getCashSeries(year, month),
  });
  // chi vẽ âm (dưới trục 0)
  const data = useMemo(
    () =>
      (isWeekly ? full ?? [] : sliceToRange(full ?? [], startMonth, endMonth)).map((d) => ({
        ...d,
        chiNeg: -(d.chi || 0),
      })),
    [full, isWeekly, startMonth, endMonth],
  );
  const sum = (k: 'thu' | 'chi') => data.reduce((s, d) => s + (d[k] || 0), 0);
  const ton = data.length ? data[data.length - 1].soDu : 0;
  const hasData = data.some((d) => d.thu || d.chi || d.soDu);

  return (
    <Card title={<span className="text-sm sm:text-base font-semibold">DÒNG TIỀN</span>}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="grid grid-cols-3 gap-3 flex-1">
          <Kpi label="Tổng thu" value={sum('thu')} color={TEAL} />
          <Kpi label="Tổng chi" value={sum('chi')} color="hsl(var(--muted-foreground))" />
          <Kpi label="Tồn" value={ton} color={ORANGE} />
        </div>
        <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Đvt: triệu</span>
      </div>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : !hasData ? (
        <Empty description="Chưa có dữ liệu" style={{ height: 280 }} className="flex flex-col items-center justify-center" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ left: -10, right: 8, top: 16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="thang" tickFormatter={(v) => `${isWeekly ? 'Tuần' : 'Th'} ${v}`} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => labelTrieu(v)} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} width={42} />
            <ReferenceLine y={0} stroke="hsl(var(--border))" />
            <Tooltip
              formatter={(value: number, name: string) => [formatCurrency(Math.abs(value)), name]}
              labelFormatter={(l) => `${isWeekly ? 'Tuần' : 'Tháng'} ${l}`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            <Bar dataKey="thu" name="Thu" fill={TEAL} maxBarSize={22}>
              <LabelList dataKey="thu" position="top" formatter={labelTrieu} style={{ fontSize: 10, fill: TEAL }} />
            </Bar>
            <Bar dataKey="chiNeg" name="Chi" fill={GRAY} maxBarSize={22}>
              <LabelList dataKey="chiNeg" position="bottom" formatter={labelTrieuAbs} style={{ fontSize: 10, fill: DASH_COLORS.muted }} />
            </Bar>
            <Line type="monotone" dataKey="soDu" name="Tồn" stroke={ORANGE} strokeWidth={2} dot={{ r: 3, fill: ORANGE }}>
              <LabelList dataKey="soDu" position="top" formatter={labelTrieu} style={{ fontSize: 10, fill: ORANGE }} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default CashFlowChart;
