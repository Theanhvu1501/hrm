import React from 'react';
import { Row, Col, Card, Statistic, Tag } from 'antd';
import { useQuyChaunState } from '../../QuyChaunHandlerContext';
import './QuyChaunStats.state';

export const QuyChaunStats: React.FC = () => {
  const [stats] = useQuyChaunState('stats', null);

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={12} lg={4}>
        <Card size="small" className="stat-card">
          <Statistic
            title="Tổng quy chuẩn"
            value={stats?.tongQuyChuan || 0}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={5}>
        <Card size="small" className="stat-card stat-card-success">
          <Statistic
            title="Phiếu thu"
            value={stats?.phieuThu || 0}
            valueStyle={{ color: '#52c41a' }}
            prefix={<Tag color="green" style={{ marginRight: 4 }}>PT</Tag>}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={5}>
        <Card size="small" className="stat-card stat-card-destructive">
          <Statistic
            title="Phiếu chi"
            value={stats?.phieuChi || 0}
            valueStyle={{ color: '#ff4d4f' }}
            prefix={<Tag color="red" style={{ marginRight: 4 }}>PC</Tag>}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={5}>
        <Card size="small" className="stat-card stat-card-success">
          <Statistic
            title="Báo có NH"
            value={stats?.baoCo || 0}
            valueStyle={{ color: '#1890ff' }}
            prefix={<Tag color="blue" style={{ marginRight: 4 }}>BC</Tag>}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={5}>
        <Card size="small" className="stat-card stat-card-destructive">
          <Statistic
            title="Báo nợ NH"
            value={stats?.baoNo || 0}
            valueStyle={{ color: '#fa8c16' }}
            prefix={<Tag color="orange" style={{ marginRight: 4 }}>BN</Tag>}
          />
        </Card>
      </Col>
    </Row>
  );
};
