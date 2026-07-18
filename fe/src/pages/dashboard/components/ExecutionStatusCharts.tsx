import React from 'react';
import { Card, Row, Col } from 'antd';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

const ITEMS = [
  { key: 'doanhThu', title: 'Tình hình thực hiện doanh thu', color: 'hsl(var(--success))' },
  { key: 'chiPhi', title: 'Tình hình thực hiện chi phí', color: 'hsl(var(--destructive))' },
  { key: 'loiNhuan', title: 'Tình hình thực hiện lợi nhuận', color: 'hsl(var(--primary))' },
];

/** Gauge nửa vòng 0%→150%. percent=0 khi chưa có dữ liệu kế hoạch. */
const Gauge: React.FC<{ percent: number; color: string }> = ({ percent, color }) => (
  <div className="relative" style={{ height: 150 }}>
    <ResponsiveContainer width="100%" height="100%">
      <RadialBarChart
        innerRadius="80%" outerRadius="100%" startAngle={180} endAngle={0}
        data={[{ value: percent }]} barSize={16}
      >
        <PolarAngleAxis type="number" domain={[0, 150]} angleAxisId={0} tick={false} />
        <RadialBar dataKey="value" angleAxisId={0} background fill={color} cornerRadius={8} />
      </RadialBarChart>
    </ResponsiveContainer>
    <div className="absolute inset-0 flex items-end justify-center pb-2">
      <span className="text-lg font-semibold text-muted-foreground">{percent.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
    </div>
    <div className="flex justify-between px-6 text-[10px] text-muted-foreground -mt-1">
      <span>0%</span><span>150%</span>
    </div>
  </div>
);

const Legend: React.FC<{ color: string }> = ({ color }) => (
  <div className="space-y-1 text-xs">
    {[['Thực hiện', color], ['Kế hoạch', 'hsl(var(--muted-foreground))'], ['Chênh lệch', color]].map(([label, c]) => (
      <div key={label} className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full" style={{ background: c as string }} />{label}</span>
        <span className="font-medium">0</span>
      </div>
    ))}
  </div>
);

const ExecutionStatusCharts: React.FC = () => (
  <Row gutter={[12, 12]}>
    {ITEMS.map((it) => (
      <Col xs={24} lg={8} key={it.key}>
        <Card title={<span className="text-sm sm:text-base">{it.title}</span>}
              extra={<span className="text-[10px] text-muted-foreground">Đvt: đồng</span>}>
          <Row align="middle" gutter={8}>
            <Col span={14}><Gauge percent={0} color={it.color} /></Col>
            <Col span={10}><Legend color={it.color} /></Col>
          </Row>
        </Card>
      </Col>
    ))}
  </Row>
);

export default ExecutionStatusCharts;
