import React from 'react';
import { Card, Row, Col, Table, Tag } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dashboardService, type OverdueRow } from '@/services/dashboardService';
import { formatCurrency } from './format';

const MAX_ROWS = 8;

function buildColumns() {
  return [
    { title: 'Đối tượng', dataIndex: 'doiTuongTen', key: 'doiTuongTen', ellipsis: true },
    {
      title: 'Còn lại',
      dataIndex: 'conLai',
      key: 'conLai',
      align: 'right' as const,
      render: (v: number) => formatCurrency(v),
    },
    {
      title: 'Quá hạn',
      dataIndex: 'soNgayQuaHan',
      key: 'soNgayQuaHan',
      align: 'right' as const,
      width: 90,
      render: (d: number) => <Tag color={d > 30 ? 'error' : 'warning'}>{d} ngày</Tag>,
    },
  ];
}

interface OverdueCardProps {
  title: string;
  loading: boolean;
  data: OverdueRow[] | undefined;
  to: string;
}

const OverdueCard: React.FC<OverdueCardProps> = ({ title, loading, data, to }) => (
  <Card
    title={<span className="text-sm sm:text-base"><WarningOutlined className="text-warning mr-2" />{title}</span>}
    extra={<Link to={to} className="text-primary text-xs sm:text-sm">Xem tất cả</Link>}
  >
    <Table
      className="excel-table"
      size="small"
      rowKey="id"
      loading={loading}
      dataSource={(data || []).slice(0, MAX_ROWS)}
      columns={buildColumns()}
      pagination={false}
      locale={{ emptyText: 'Không có công nợ quá hạn' }}
    />
  </Card>
);

const OverdueTables: React.FC = () => {
  const arQ = useQuery({ queryKey: ['dash-overdue-ar'], queryFn: () => dashboardService.getOverdueAr() });
  const apQ = useQuery({ queryKey: ['dash-overdue-ap'], queryFn: () => dashboardService.getOverdueAp() });

  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} lg={12}>
        <OverdueCard title="Phải thu quá hạn" loading={arQ.isLoading} data={arQ.data} to="/cong-no/phai-thu" />
      </Col>
      <Col xs={24} lg={12}>
        <OverdueCard title="Phải trả quá hạn" loading={apQ.isLoading} data={apQ.data} to="/cong-no/phai-tra" />
      </Col>
    </Row>
  );
};

export default OverdueTables;
