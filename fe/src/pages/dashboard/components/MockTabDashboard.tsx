import React from 'react';
import { Card, Row, Col, Typography, Tag } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  TeamOutlined,
  UserOutlined,
  CalendarOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  RiseOutlined,
  UsergroupAddOutlined,
  PercentageOutlined,
  FileTextOutlined,
  DashboardOutlined,
  AlertOutlined,
  BarChartOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DASH_COLORS } from './format';

const { Text } = Typography;

/**
 * Dashboard mẫu (UI tĩnh) cho các tab Nhân sự / Kinh Doanh / Điều hành.
 * Chỉ phục vụ demo — KHÔNG gọi API, dữ liệu là mẫu cố định.
 */

interface MockKpi {
  key: string;
  label: string;
  value: string;
  /** % so kỳ trước (mẫu) */
  delta: number;
  /** true: tăng là xấu (đỏ) */
  inverse?: boolean;
  icon: React.ReactNode;
  valueClass: string;
  iconBg: string;
}

interface MockBar {
  thang: string;
  primary: number;
  secondary: number;
}

interface MockSlice {
  ten: string;
  value: number;
}

export interface MockTabConfig {
  kpis: MockKpi[];
  barTitle: string;
  barPrimaryName: string;
  barSecondaryName: string;
  barData: MockBar[];
  pieTitle: string;
  pieData: MockSlice[];
}

const PIE_PALETTE = [
  'hsl(var(--primary))',
  'hsl(var(--brand-gold))',
  'hsl(var(--success))',
  'hsl(var(--destructive))',
  'hsl(var(--muted-foreground))',
];

const MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

const mkBars = (primary: number[], secondary: number[]): MockBar[] =>
  MONTHS.map((thang, i) => ({ thang, primary: primary[i], secondary: secondary[i] }));

// ----- Cấu hình dữ liệu mẫu theo từng tab -----
export const MOCK_TABS: Record<string, MockTabConfig> = {
  'nhan-su': {
    kpis: [
      { key: 'tong', label: 'Tổng nhân sự', value: '128 người', delta: 4.2, icon: <TeamOutlined />, valueClass: 'text-primary', iconBg: 'bg-primary/10 text-primary' },
      { key: 'dilam', label: 'Đi làm hôm nay', value: '119 người', delta: 1.5, icon: <UserOutlined />, valueClass: 'text-success', iconBg: 'bg-success/10 text-success' },
      { key: 'nghi', label: 'Nghỉ phép', value: '6 người', delta: 12.0, inverse: true, icon: <CalendarOutlined />, valueClass: 'text-destructive', iconBg: 'bg-destructive/10 text-destructive' },
      { key: 'luong', label: 'Quỹ lương tháng', value: '1.2 tỷ', delta: 3.8, icon: <DollarOutlined />, valueClass: 'text-primary', iconBg: 'bg-primary/10 text-primary' },
    ],
    barTitle: 'Biến động nhân sự theo tháng',
    barPrimaryName: 'Tuyển mới',
    barSecondaryName: 'Nghỉ việc',
    barData: mkBars([5, 3, 8, 4, 6, 7, 5, 9, 4, 6, 3, 5], [2, 4, 1, 3, 2, 1, 3, 2, 4, 1, 2, 3]),
    pieTitle: 'Cơ cấu phòng ban',
    pieData: [
      { ten: 'Kinh doanh', value: 42 },
      { ten: 'Kỹ thuật', value: 35 },
      { ten: 'Kế toán', value: 18 },
      { ten: 'Hành chính', value: 15 },
      { ten: 'Khác', value: 18 },
    ],
  },
  'kinh-doanh': {
    kpis: [
      { key: 'donhang', label: 'Đơn hàng', value: '342', delta: 9.1, icon: <ShoppingCartOutlined />, valueClass: 'text-primary', iconBg: 'bg-primary/10 text-primary' },
      { key: 'doanhso', label: 'Doanh số', value: '4.8 tỷ', delta: 6.4, icon: <RiseOutlined />, valueClass: 'text-success', iconBg: 'bg-success/10 text-success' },
      { key: 'khachmoi', label: 'Khách hàng mới', value: '57', delta: 11.2, icon: <UsergroupAddOutlined />, valueClass: 'text-primary', iconBg: 'bg-primary/10 text-primary' },
      { key: 'tylechot', label: 'Tỷ lệ chốt', value: '28%', delta: 2.3, icon: <PercentageOutlined />, valueClass: 'text-success', iconBg: 'bg-success/10 text-success' },
    ],
    barTitle: 'Doanh số theo tháng',
    barPrimaryName: 'Doanh số',
    barSecondaryName: 'Mục tiêu',
    barData: mkBars(
      [320, 410, 380, 450, 520, 480, 540, 610, 500, 560, 620, 700],
      [350, 400, 400, 450, 500, 500, 550, 600, 550, 600, 650, 700],
    ),
    pieTitle: 'Top sản phẩm',
    pieData: [
      { ten: 'Sản phẩm A', value: 38 },
      { ten: 'Sản phẩm B', value: 27 },
      { ten: 'Sản phẩm C', value: 19 },
      { ten: 'Sản phẩm D', value: 11 },
      { ten: 'Khác', value: 5 },
    ],
  },
  'dieu-hanh': {
    kpis: [
      { key: 'doanhthu', label: 'Doanh thu', value: '12.5 tỷ', delta: 7.6, icon: <RiseOutlined />, valueClass: 'text-success', iconBg: 'bg-success/10 text-success' },
      { key: 'loinhuan', label: 'Lợi nhuận', value: '3.1 tỷ', delta: 5.2, icon: <FileTextOutlined />, valueClass: 'text-primary', iconBg: 'bg-primary/10 text-primary' },
      { key: 'hieusuat', label: 'Hiệu suất', value: '87%', delta: 1.8, icon: <DashboardOutlined />, valueClass: 'text-primary', iconBg: 'bg-primary/10 text-primary' },
      { key: 'canhbao', label: 'Cảnh báo', value: '3', delta: 25.0, inverse: true, icon: <AlertOutlined />, valueClass: 'text-destructive', iconBg: 'bg-destructive/10 text-destructive' },
    ],
    barTitle: 'Tổng hợp KPI theo tháng',
    barPrimaryName: 'Doanh thu',
    barSecondaryName: 'Lợi nhuận',
    barData: mkBars(
      [820, 910, 880, 1050, 1120, 1080, 1140, 1210, 1100, 1160, 1220, 1250],
      [180, 210, 200, 250, 280, 260, 290, 310, 270, 300, 320, 310],
    ),
    pieTitle: 'Tiến độ mục tiêu năm',
    pieData: [
      { ten: 'Hoàn thành', value: 64 },
      { ten: 'Đang thực hiện', value: 22 },
      { ten: 'Chậm tiến độ', value: 9 },
      { ten: 'Chưa bắt đầu', value: 5 },
    ],
  },
};

const DeltaTag: React.FC<{ delta: number; inverse?: boolean }> = ({ delta, inverse }) => {
  const up = delta >= 0;
  const good = inverse ? !up : up;
  const color = good ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
  return (
    <span className="text-[10px] sm:text-xs font-medium" style={{ color }}>
      {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(delta).toFixed(1)}% so kỳ trước
    </span>
  );
};

const MockTabDashboard: React.FC<{ config: MockTabConfig }> = ({ config }) => {
  const pieTotal = config.pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-3">
      {/* Nhãn dữ liệu mẫu */}
      <Tag color="gold" style={{ marginInlineEnd: 0 }}>
        Giao diện mẫu — dữ liệu minh hoạ
      </Tag>

      {/* KPI */}
      <Row gutter={[12, 12]}>
        {config.kpis.map((c) => (
          <Col xs={12} lg={6} key={c.key}>
            <Card className="stat-card h-full">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Text className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wide font-medium block truncate">
                    {c.label}
                  </Text>
                  <div className={`mt-1 sm:mt-2 text-lg sm:text-2xl font-bold truncate ${c.valueClass}`}>
                    {c.value}
                  </div>
                  <div className="mt-1 sm:mt-2">
                    <DeltaTag delta={c.delta} inverse={c.inverse} />
                  </div>
                </div>
                <div className={`w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0 text-base sm:text-xl ${c.iconBg}`}>
                  {c.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Biểu đồ */}
      <Row gutter={[12, 12]}>
        <Col xs={24} lg={12}>
          <Card title={<span className="text-sm sm:text-base"><BarChartOutlined className="text-primary mr-2" />{config.barTitle}</span>}>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={config.barData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="thang" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="primary" name={config.barPrimaryName} fill={DASH_COLORS.balance} radius={[3, 3, 0, 0]} barSize={14} />
                <Line type="monotone" dataKey="secondary" name={config.barSecondaryName} stroke={DASH_COLORS.accent} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<span className="text-sm sm:text-base"><PieChartOutlined className="text-primary mr-2" />{config.pieTitle}</span>}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={config.pieData}
                  dataKey="value"
                  nameKey="ten"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  label={(entry) => `${pieTotal > 0 ? ((entry.value / pieTotal) * 100).toFixed(0) : '0'}%`}
                  labelLine={false}
                >
                  {config.pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MockTabDashboard;
