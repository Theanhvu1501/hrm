import React from 'react';
import { Card, Row, Col, Skeleton, Empty } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { dashboardService, type TopPartner } from '@/services/dashboardService';
import { formatCurrency, formatShortCurrency, DASH_COLORS } from './format';

const HBar: React.FC<{ data: TopPartner[]; color: string }> = ({ data, color }) => (
  <ResponsiveContainer width="100%" height={Math.max(220, data.length * 48)}>
    <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
      <XAxis type="number" tickFormatter={(v) => formatShortCurrency(v)} stroke={DASH_COLORS.muted} tick={{ fontSize: 11 }} />
      <YAxis
        type="category"
        dataKey="doiTuongTen"
        width={120}
        stroke={DASH_COLORS.muted}
        tick={{ fontSize: 11 }}
        tickFormatter={(v: string) => (v && v.length > 16 ? `${v.slice(0, 16)}…` : v)}
      />
      <Tooltip formatter={(value: number) => formatCurrency(value)} />
      <Bar dataKey="conLai" name="Còn lại" maxBarSize={28}>
        {data.map((_, i) => (
          <Cell key={i} fill={color} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

const TopPartnersCharts: React.FC = () => {
  const arQ = useQuery({ queryKey: ['dash-top-ar'], queryFn: () => dashboardService.getTopReceivables() });
  const apQ = useQuery({ queryKey: ['dash-top-ap'], queryFn: () => dashboardService.getTopPayables() });

  const renderBody = (loading: boolean, data: TopPartner[] | undefined, color: string) => {
    if (loading) return <Skeleton active paragraph={{ rows: 5 }} />;
    if (!data || data.length === 0) {
      return <Empty description="Chưa có dữ liệu" style={{ height: 220 }} className="flex flex-col items-center justify-center" />;
    }
    return <HBar data={data} color={color} />;
  };

  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} lg={12}>
        <Card title={<span className="text-sm sm:text-base"><TeamOutlined className="text-primary mr-2" />Top 5 khách hàng phải thu</span>}>
          {renderBody(arQ.isLoading, arQ.data, DASH_COLORS.revenue)}
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card title={<span className="text-sm sm:text-base"><TeamOutlined className="text-primary mr-2" />Top 5 NCC phải trả</span>}>
          {renderBody(apQ.isLoading, apQ.data, DASH_COLORS.expense)}
        </Card>
      </Col>
    </Row>
  );
};

export default TopPartnersCharts;
