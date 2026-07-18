import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Breadcrumb,
  Statistic,
  DatePicker,
  Tabs,
  Tag,
} from 'antd';
import {
  ExportOutlined,
  HomeOutlined,
  WalletOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  BankOutlined,
  CalendarOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { SoQuy } from '@/types';
import { soQuyService, DailySummary } from '@/services/soQuyService';
import { useIntroAnimation } from '@/hooks/useIntroAnimation';
import dayjs from 'dayjs';
import { FilterBar } from "@/components/common/FilterBar";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const SoQuyPage: React.FC = () => {
  const { canExport } = usePagePermission("/so-quy");
  const [data, setData] = useState<SoQuy[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [stats, setStats] = useState({ tonDauKy: 0, tongThu: 0, tongChi: 0, tonCuoiKy: 0 });
  const [activeTab, setActiveTab] = useState('detail');
  const [statsCollapsed, setStatsCollapsed] = useState(false);
  const { showIntro } = useIntroAnimation(1500);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [entries, statsData, summary] = await Promise.all([
        soQuyService.getAll(),
        soQuyService.getStats(),
        soQuyService.getDailySummary(),
      ]);
      setData(entries);
      setStats(statsData);
      setDailySummary(summary);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = async (value: string) => {
    setSearchText(value);
    if (value.trim()) {
      setLoading(true);
      try {
        const result = await soQuyService.search(value);
        setData(result);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    } else {
      fetchData();
    }
  };

  const handleDateRangeChange = async (dates: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
    setDateRange(dates);
    if (dates && dates[0] && dates[1]) {
      setLoading(true);
      try {
        const result = await soQuyService.getByDateRange(
          dates[0].format('YYYY-MM-DD'),
          dates[1].format('YYYY-MM-DD')
        );
        setData(result);
      } catch (error) {
        console.error('Filter error:', error);
      } finally {
        setLoading(false);
      }
    } else {
      fetchData();
    }
  };

  const resetFilters = () => {
    setSearchText('');
    setDateRange(null);
    fetchData();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatShortCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(0)}M`;
    }
    return formatCurrency(value);
  };

  const detailColumns = [
    {
      title: 'Ngày',
      dataIndex: 'ngay',
      key: 'ngay',
      width: 110,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Số chứng từ',
      dataIndex: 'soPhieu',
      key: 'soPhieu',
      width: 130,
      render: (text: string) => {
        const isPT = text.startsWith('PT');
        return (
          <Tag color={isPT ? 'success' : 'error'}>
            {isPT ? <ArrowDownOutlined className="mr-1" /> : <ArrowUpOutlined className="mr-1" />}
            {text}
          </Tag>
        );
      },
    },
    {
      title: 'Diễn giải',
      dataIndex: 'noiDung',
      key: 'noiDung',
      ellipsis: true,
      render: (text: string, record: SoQuy) => text || record.dienGiai || '-',
    },
    {
      title: 'Thu',
      dataIndex: 'thu',
      key: 'thu',
      width: 140,
      align: 'right' as const,
      render: (value: number) => (
        value > 0 ? (
          <Text strong className="text-green-600">{formatCurrency(value)}</Text>
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
    {
      title: 'Chi',
      dataIndex: 'chi',
      key: 'chi',
      width: 140,
      align: 'right' as const,
      render: (value: number) => (
        value > 0 ? (
          <Text strong className="text-red-600">{formatCurrency(value)}</Text>
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
    {
      title: 'Tồn quỹ',
      dataIndex: 'soDu',
      key: 'soDu',
      width: 160,
      align: 'right' as const,
      render: (value: number) => (
        <Text strong className={value >= 0 ? 'text-blue-600' : 'text-red-600'}>
          {formatCurrency(value)}
        </Text>
      ),
    },
  ];

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('soQuy.main', detailColumns);

  const dailyColumns = [
    {
      title: 'Ngày',
      dataIndex: 'ngay',
      key: 'ngay',
      width: 120,
      render: (date: string) => (
        <Space>
          <CalendarOutlined className="text-muted-foreground" />
          <Text strong>{dayjs(date).format('DD/MM/YYYY')}</Text>
        </Space>
      ),
    },
    {
      title: 'Thứ',
      key: 'dayOfWeek',
      width: 80,
      render: (_: any, record: DailySummary) => {
        const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        return <Text type="secondary">{days[dayjs(record.ngay).day()]}</Text>;
      },
    },
    {
      title: 'Tổng thu',
      dataIndex: 'thu',
      key: 'thu',
      align: 'right' as const,
      render: (value: number) => (
        value > 0 ? (
          <Text className="text-green-600">{formatCurrency(value)}</Text>
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
    {
      title: 'Tổng chi',
      dataIndex: 'chi',
      key: 'chi',
      align: 'right' as const,
      render: (value: number) => (
        value > 0 ? (
          <Text className="text-red-600">{formatCurrency(value)}</Text>
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
    {
      title: 'Chênh lệch',
      key: 'diff',
      align: 'right' as const,
      render: (_: any, record: DailySummary) => {
        const diff = record.thu - record.chi;
        return (
          <Text className={diff >= 0 ? 'text-green-600' : 'text-red-600'}>
            {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
          </Text>
        );
      },
    },
    {
      title: 'Số dư cuối ngày',
      dataIndex: 'soDu',
      key: 'soDu',
      align: 'right' as const,
      render: (value: number) => (
        <Text strong className="text-blue-600">{formatCurrency(value)}</Text>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { href: '/', title: <><HomeOutlined /> Trang chủ</> },
          { title: 'Sổ quỹ' },
        ]}
      />

      {/* Page Header - Auto hide after 1.5s */}
      <div 
        className={`page-header text-white overflow-hidden transition-all duration-700 ease-out ${
          showIntro 
            ? 'max-h-32 p-6 opacity-100' 
            : 'max-h-0 p-0 opacity-0 -mt-6'
        }`}
        style={{ background: 'linear-gradient(135deg, hsl(45 80% 45%), hsl(30 70% 40%))' }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <WalletOutlined className="text-2xl animate-pulse" />
            <Title level={3} className="!text-white !mb-0">
              Sổ Quỹ Tiền Mặt
            </Title>
          </div>
          <Text className="text-white/80">
            Theo dõi thu chi và số dư quỹ tiền mặt theo ngày
          </Text>
        </div>
      </div>

      {/* Collapsible Stats Cards */}
      <Card className="shadow-sm transition-all duration-500" size="small">
        <div 
          className="flex items-center justify-between cursor-pointer select-none"
          onClick={() => setStatsCollapsed(!statsCollapsed)}
        >
          <Text strong className="text-muted-foreground uppercase text-xs tracking-wider">
            Thống kê tổng quan
          </Text>
          <Button 
            type="text" 
            size="small" 
            icon={statsCollapsed ? <DownOutlined /> : <UpOutlined />}
          >
            {statsCollapsed ? 'Mở rộng' : 'Thu gọn'}
          </Button>
        </div>
        
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            statsCollapsed ? 'max-h-0 opacity-0 mt-0' : 'max-h-96 opacity-100 mt-4'
          }`}
        >
          <Row gutter={16}>
            <Col xs={12} sm={6}>
              <Card className="stat-card" size="small">
                <Statistic
                  title="Số dư đầu kỳ"
                  value={stats.tonDauKy}
                  prefix={<BankOutlined className="text-blue-500" />}
                  formatter={(value) => formatShortCurrency(Number(value))}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="stat-card stat-card-success" size="small">
                <Statistic
                  title="Tổng thu"
                  value={stats.tongThu}
                  prefix={<ArrowDownOutlined />}
                  formatter={(value) => formatShortCurrency(Number(value))}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="stat-card stat-card-destructive" size="small">
                <Statistic
                  title="Tổng chi"
                  value={stats.tongChi}
                  prefix={<ArrowUpOutlined />}
                  formatter={(value) => formatShortCurrency(Number(value))}
                  valueStyle={{ color: '#ef4444' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="stat-card" size="small" style={{ borderLeftColor: 'hsl(210, 80%, 50%)' }}>
                <Statistic
                  title="Số dư hiện tại"
                  value={stats.tonCuoiKy}
                  prefix={<WalletOutlined />}
                  formatter={(value) => formatShortCurrency(Number(value))}
                  valueStyle={{ color: stats.tonCuoiKy >= 0 ? '#1890ff' : '#ef4444' }}
                />
              </Card>
            </Col>
          </Row>
        </div>
      </Card>

      {/* Main Card */}
      <Card className="shadow-sm">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'detail',
              label: (
                <span>
                  <WalletOutlined className="mr-2" />
                  Chi tiết thu chi
                </span>
              ),
              children: (
                <>
                  {/* Toolbar */}
                  <FilterBar
                    className="mb-4"
                    search={{
                      value: searchText,
                      onChange: handleSearch,
                      placeholder: 'Tìm theo số phiếu, nội dung...',
                    }}
                    onReset={resetFilters}
                    filters={
                      <RangePicker
                        format="DD/MM/YYYY"
                        value={dateRange}
                        onChange={(dates) => handleDateRangeChange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                        placeholder={['Từ ngày', 'Đến ngày']}
                      />
                    }
                    actions={
                      <>
                        {canExport && <Button icon={<ExportOutlined />}>Xuất Excel</Button>}
                        {settingsButton}
                      </>
                    }
                  />

                  {/* Opening Balance Row */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4 flex justify-between items-center">
                    <Text strong>Số dư đầu kỳ</Text>
                    <Text strong className="text-blue-600 text-lg">
                      {formatCurrency(stats.tonDauKy)}
                    </Text>
                  </div>

                  {/* Table */}
                  <Table
                    columns={cfgColumns}
                    dataSource={data}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                      total: data.length,
                      pageSize: 50,
                      showSizeChanger: true,
                      showTotal: (total) => `Tổng ${total} giao dịch`,
                    }}
                    size="middle"
                    scroll={{ x: 900 }}
                    summary={(pageData) => {
                      const totalThu = pageData.reduce((sum, r) => sum + r.thu, 0);
                      const totalChi = pageData.reduce((sum, r) => sum + r.chi, 0);
                      return (
                        <Table.Summary fixed>
                          <Table.Summary.Row className="bg-muted/50">
                            <Table.Summary.Cell index={0} colSpan={3}>
                              <Text strong>Tổng cộng trang này</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right">
                              <Text strong className="text-green-600">{formatCurrency(totalThu)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={4} align="right">
                              <Text strong className="text-red-600">{formatCurrency(totalChi)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={5} align="right">
                              <Text strong className={totalThu - totalChi >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {totalThu - totalChi >= 0 ? '+' : ''}{formatCurrency(totalThu - totalChi)}
                              </Text>
                            </Table.Summary.Cell>
                          </Table.Summary.Row>
                        </Table.Summary>
                      );
                    }}
                  />
                </>
              ),
            },
            {
              key: 'daily',
              label: (
                <span>
                  <CalendarOutlined className="mr-2" />
                  Tổng hợp theo ngày
                </span>
              ),
              children: (
                <Table
                  columns={dailyColumns}
                  dataSource={dailySummary}
                  rowKey="ngay"
                  loading={loading}
                  pagination={{
                    pageSize: 20,
                    showTotal: (total) => `Tổng ${total} ngày`,
                  }}
                  size="middle"
                  summary={(pageData) => {
                    const totalThu = pageData.reduce((sum, r) => sum + r.thu, 0);
                    const totalChi = pageData.reduce((sum, r) => sum + r.chi, 0);
                    return (
                      <Table.Summary fixed>
                        <Table.Summary.Row className="bg-muted/50">
                          <Table.Summary.Cell index={0} colSpan={2}>
                            <Text strong>Tổng cộng</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="right">
                            <Text strong className="text-green-600">{formatCurrency(totalThu)}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right">
                            <Text strong className="text-red-600">{formatCurrency(totalChi)}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={4} align="right">
                            <Text strong className={totalThu - totalChi >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {totalThu - totalChi >= 0 ? '+' : ''}{formatCurrency(totalThu - totalChi)}
                            </Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={5} />
                        </Table.Summary.Row>
                      </Table.Summary>
                    );
                  }}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default SoQuyPage;
