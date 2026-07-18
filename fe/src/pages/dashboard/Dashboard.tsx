import React, { useMemo, useState } from 'react';
import { Select, Space, Typography, Segmented, ConfigProvider, Button, Tooltip, message } from 'antd';
import { CheckCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import RevenueTrendChart from './components/RevenueTrendChart';
import CashFlowChart from './components/CashFlowChart';
import RevenueExpenseBreakdownCharts from './components/RevenueExpenseBreakdownCharts';
import CongNoChart from './components/CongNoChart';
import BalanceStructureChart from './components/BalanceStructureChart';
import ExecutionStatusCharts from './components/ExecutionStatusCharts';
import NghiaVuChinhSachTable from './components/NghiaVuChinhSachTable';
import MockTabDashboard, { MOCK_TABS } from './components/MockTabDashboard';
import DashboardSettingsModal, { ALL_BLOCK_KEYS } from './components/DashboardSettingsModal';
import { Row, Col } from 'antd';
import { PERIOD_OPTIONS, resolvePeriod, type DashboardPeriod } from './period';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { tenantService } from '@/services/tenantService';

const { Text } = Typography;

const TAB_OPTIONS = [
  { label: 'Tài chính', value: 'tai-chinh' },
  { label: 'Nhân sự', value: 'nhan-su' },
  { label: 'Kinh doanh', value: 'kinh-doanh' },
  { label: 'Điều hành', value: 'dieu-hanh' },
];

const now = new Date();
const CURRENT_YEAR = now.getFullYear();

const Dashboard: React.FC = () => {
  const [period, setPeriod] = useState<DashboardPeriod>('namNay');
  const { year, startMonth, endMonth } = resolvePeriod(period, CURRENT_YEAR);
  const [activeTab, setActiveTab] = useState<string>('tai-chinh');
  const isAdmin = useIsAdmin();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data: config, refetch: refetchConfig } = useQuery({
    queryKey: ['dash-config'],
    queryFn: () => tenantService.getDashboardConfig(),
  });
  // config null/undefined = chưa cấu hình → hiển thị tất cả khối.
  const visibleKeys = useMemo(
    () => (Array.isArray(config) ? config : ALL_BLOCK_KEYS),
    [config],
  );
  const show = (key: string) => visibleKeys.includes(key);

  const handleSaveConfig = async (blocks: string[]) => {
    setSaving(true);
    try {
      await tenantService.updateDashboardConfig(blocks);
      await refetchConfig();
      message.success('Đã lưu cấu hình báo cáo');
      setSettingsOpen(false);
    } catch {
      message.error('Lưu cấu hình thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Filter bar — ghim trên cùng khi cuộn */}
      <div
        className="sticky z-20 flex flex-wrap items-center justify-between gap-2"
        style={{
          top: 0,
          marginInline: -12,
          padding: '10px 12px',
          background: 'hsl(var(--background))',
          borderBottom: '1px solid hsl(var(--border))',
        }}
      >
        <div className="flex items-center gap-2">
          <CheckCircleOutlined className="text-primary" />
          <Text strong className="text-sm sm:text-base">Tổng quan báo cáo</Text>
        </div>
        <ConfigProvider
          theme={{
            components: {
              Segmented: {
                itemSelectedBg: 'hsl(var(--primary))',
                itemSelectedColor: '#fff',
                itemColor: 'hsl(var(--primary))',
                itemHoverColor: 'hsl(var(--primary))',
                trackBg: 'hsl(var(--primary) / 0.08)',
                fontSize: 15,
              },
            },
          }}
        >
          <Segmented
            value={activeTab}
            onChange={(v) => setActiveTab(v as string)}
            options={TAB_OPTIONS}
            size="large"
            className="font-semibold"
          />
        </ConfigProvider>
        <Space wrap>
          <Select
            value={period}
            onChange={setPeriod}
            options={PERIOD_OPTIONS}
            style={{ width: 180 }}
            showSearch
            optionFilterProp="label"
          />
          {isAdmin && activeTab === 'tai-chinh' && (
            <Tooltip title="Chọn báo cáo hiển thị">
              <Button icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)} />
            </Tooltip>
          )}
        </Space>
      </div>

      {activeTab === 'tai-chinh' ? (
        <>
          {/* Xu hướng: KQKD | Dòng tiền */}
          {(show('kqkd') || show('dongTien')) && (
            <Row gutter={[12, 12]}>
              {show('kqkd') && <Col xs={24} lg={12}><RevenueTrendChart year={year} startMonth={startMonth} endMonth={endMonth} /></Col>}
              {show('dongTien') && <Col xs={24} lg={12}><CashFlowChart year={year} startMonth={startMonth} endMonth={endMonth} /></Col>}
            </Row>
          )}

          {/* Tình hình thực hiện */}
          {show('tinhHinhThucHien') && <ExecutionStatusCharts />}

          {/* Tỷ trọng doanh thu / chi phí */}
          {show('tyTrong') && <RevenueExpenseBreakdownCharts year={year} startMonth={startMonth} endMonth={endMonth} />}

          {/* Công nợ | Cân đối tài chính */}
          {(show('congNo') || show('canDoi')) && (
            <Row gutter={[12, 12]}>
              {show('congNo') && <Col xs={24} lg={12}><CongNoChart year={year} startMonth={startMonth} endMonth={endMonth} /></Col>}
              {show('canDoi') && <Col xs={24} lg={12}><BalanceStructureChart /></Col>}
            </Row>
          )}

          {/* Tình hình thực hiện nghĩa vụ chính sách */}
          {show('nghiaVuChinhSach') && <NghiaVuChinhSachTable year={year} />}
        </>
      ) : (
        <MockTabDashboard config={MOCK_TABS[activeTab]} />
      )}

      <DashboardSettingsModal
        open={settingsOpen}
        value={visibleKeys}
        saving={saving}
        onSave={handleSaveConfig}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
