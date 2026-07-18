import React from 'react';
import { Card, Row, Col, Skeleton, Empty } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dashboardService, type AgingBuckets } from '@/services/dashboardService';
import { formatCurrency } from './format';

// chưa đến hạn = navy; quá hạn đậm dần vàng -> cam -> đỏ
const AGING_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--brand-gold))',
  '#fa8c16',
  '#fa541c',
  'hsl(var(--destructive))',
];

interface Slice {
  ten: string;
  soTien: number;
}

function toSlices(b: AgingBuckets): Slice[] {
  return [
    { ten: 'Chưa đến hạn', soTien: b.chuaDenHan || 0 },
    { ten: 'Quá hạn 1-30', soTien: b.quaHan1_30 || 0 },
    { ten: 'Quá hạn 31-60', soTien: b.quaHan31_60 || 0 },
    { ten: 'Quá hạn 61-90', soTien: b.quaHan61_90 || 0 },
    { ten: 'Quá hạn >90', soTien: b.quaHanTren90 || 0 },
  ];
}

const Donut: React.FC<{ data: Slice[] }> = ({ data }) => {
  const total = data.reduce((s, d) => s + Math.abs(d.soTien), 0);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="soTien"
          nameKey="ten"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={2}
          label={(entry) => {
            if (!entry.soTien) return '';
            const pct = total > 0 ? ((Math.abs(entry.soTien) / total) * 100).toFixed(0) : '0';
            return `${pct}%`;
          }}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={AGING_COLORS[i % AGING_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
};

const AgingCharts: React.FC = () => {
  const arQ = useQuery({ queryKey: ['dash-ar-aging'], queryFn: () => dashboardService.getArAging() });
  const apQ = useQuery({ queryKey: ['dash-ap-aging'], queryFn: () => dashboardService.getApAging() });

  const renderBody = (loading: boolean, b: AgingBuckets | undefined) => {
    if (loading) return <Skeleton active paragraph={{ rows: 5 }} />;
    const slices = b ? toSlices(b) : [];
    const hasData = slices.some((s) => s.soTien);
    if (!hasData) {
      return <Empty description="Chưa có dữ liệu" style={{ height: 280 }} className="flex flex-col items-center justify-center" />;
    }
    return <Donut data={slices} />;
  };

  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} lg={12}>
        <Card title={<span className="text-sm sm:text-base"><ClockCircleOutlined className="text-primary mr-2" />Tuổi nợ phải thu</span>}>
          {renderBody(arQ.isLoading, arQ.data)}
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card title={<span className="text-sm sm:text-base"><ClockCircleOutlined className="text-primary mr-2" />Tuổi nợ phải trả</span>}>
          {renderBody(apQ.isLoading, apQ.data)}
        </Card>
      </Col>
    </Row>
  );
};

export default AgingCharts;
