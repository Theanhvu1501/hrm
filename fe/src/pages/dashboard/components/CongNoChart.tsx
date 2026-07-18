import React, { useMemo } from 'react';
import { Card, Skeleton, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dashboardService } from '@/services/dashboardService';
import { sliceToRange } from '../period';
import { formatCurrency, DASH_COLORS } from './format';

interface Props { year: number; startMonth: number; endMonth: number; }

const labelTrieu = (v: number) => (v ? Math.round(v / 1e6).toLocaleString('vi-VN') : '');

const CongNoChart: React.FC<Props> = ({ year, startMonth, endMonth }) => {
  const isWeekly = startMonth === endMonth;
  const month = isWeekly ? startMonth : undefined;
  const { data: full, isLoading } = useQuery({
    queryKey: ['dash-congno-series', year, month ?? 0],
    queryFn: () => dashboardService.getCongNoSeries(year, month),
  });
  const data = useMemo(
    () => (isWeekly ? full ?? [] : sliceToRange(full ?? [], startMonth, endMonth)),
    [full, isWeekly, startMonth, endMonth],
  );
  const hasData = data.some((d) => d.tongPhaiThu || d.tongPhaiTra);

  return (
    <Card
      title={<span className="text-sm sm:text-base font-semibold">CÔNG NỢ</span>}
      extra={<span className="text-[10px] sm:text-xs text-muted-foreground">Đvt: triệu</span>}
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : !hasData ? (
        <Empty description="Chưa có dữ liệu" style={{ height: 280 }} className="flex flex-col items-center justify-center" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ left: -10, right: 8, top: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="thang" tickFormatter={(v) => `${isWeekly ? 'Tuần' : 'Th'} ${v}`} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => labelTrieu(v)} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} width={42} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={(l) => `${isWeekly ? 'Tuần' : 'Tháng'} ${l}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            <Line type="monotone" dataKey="tongPhaiThu" name="Tổng phải thu" stroke={DASH_COLORS.revenue} strokeWidth={2} dot={{ r: 3 }}>
              <LabelList dataKey="tongPhaiThu" position="top" formatter={labelTrieu} style={{ fontSize: 10, fill: DASH_COLORS.revenue }} />
            </Line>
            <Line type="monotone" dataKey="tongPhaiTra" name="Tổng phải trả" stroke={DASH_COLORS.expense} strokeWidth={2} dot={{ r: 3 }}>
              <LabelList dataKey="tongPhaiTra" position="bottom" formatter={labelTrieu} style={{ fontSize: 10, fill: DASH_COLORS.expense }} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default CongNoChart;
