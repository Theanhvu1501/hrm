import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Statistic,
  Row,
  Col,
  Tabs,
  Breadcrumb,
  Select,
  Tag,
  message,
} from 'antd';
import {
  ReloadOutlined,
  ExportOutlined,
  HomeOutlined,
  RiseOutlined,
  FallOutlined,
  LineChartOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  pnlService,
  PnLSummary,
  PnLGroupedData,
  PnLItem,
} from '@/services/pnlService';
import { usePagePermission } from "@/hooks/usePagePermission";
import { FilterBar } from "@/components/common/FilterBar";
import { exportReportExcel } from "@/utils/exportReportExcel";
import { buildPnLSheets } from "./pnlExport";

const PERIOD_LABEL: Record<string, string> = {
  thangNay: "Tháng này",
  thangTruoc: "Tháng trước",
  luyKe: "Lũy kế năm",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

const formatCurrencyShort = (value: number) => {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} tr`;
  return formatCurrency(value);
};

type PnLRow = {
  key: string;
  khoanMuc: string;
  soTien: number;
  isCategory?: boolean;
  isSummary?: boolean;
};

const PnLPage: React.FC = () => {
  const { canExport } = usePagePermission("/bao-cao/pnl");
  const [groupedData, setGroupedData] = useState<PnLGroupedData[]>([]);
  const [summary, setSummary] = useState<PnLSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'thangNay' | 'thangTruoc' | 'luyKe'>('thangNay');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    const sheets = buildPnLSheets(groupedData, summary, PERIOD_LABEL[selectedPeriod]);
    if (sheets.length === 0) { message.warning("Không có dữ liệu để xuất"); return; }
    setExporting(true);
    try {
      await exportReportExcel("Bao cao lai lo PnL", sheets);
      message.success("Đã xuất Excel");
    } catch (e) {
      console.error("export excel error", e);
      message.error("Xuất Excel thất bại");
    } finally {
      setExporting(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [grouped, summaryData] = await Promise.all([
        pnlService.getGroupedPnLData(selectedPeriod),
        pnlService.getSummary(selectedPeriod),
      ]);
      setGroupedData(grouped);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const buildTableData = (): PnLRow[] => {
    const rows: PnLRow[] = [];

    groupedData.forEach((group, gIndex) => {
      // Category header
      rows.push({
        key: `cat-${gIndex}`,
        khoanMuc: group.category.name,
        soTien: group.subtotal,
        isCategory: true,
      });

      // Items
      group.items.forEach((item: PnLItem, iIndex: number) => {
        rows.push({
          key: `item-${gIndex}-${iIndex}`,
          khoanMuc: `   ${item.ma} - ${item.ten}`,
          soTien: item.soTien,
        });
      });
    });

    // Lợi nhuận trước thuế
    const loiNhuanTruocThue = summary?.loiNhuanTruocThue ?? 0;
    rows.push({
      key: 'profit-before-tax',
      khoanMuc: 'LỢI NHUẬN TRƯỚC THUẾ',
      soTien: loiNhuanTruocThue,
      isSummary: true,
    });

    // Thuế
    rows.push({
      key: 'tax',
      khoanMuc: '   Thuế TNDN (20%)',
      soTien: -(summary?.thue ?? 0),
    });

    // Lợi nhuận sau thuế
    rows.push({
      key: 'net-profit',
      khoanMuc: 'LỢI NHUẬN SAU THUẾ',
      soTien: summary?.loiNhuanSauThue ?? 0,
      isSummary: true,
    });

    return rows;
  };

  const columns: ColumnsType<PnLRow> = [
    {
      title: 'Khoản mục',
      dataIndex: 'khoanMuc',
      key: 'khoanMuc',
      width: 400,
      render: (text: string, record: PnLRow) => (
        <span style={{
          fontWeight: record.isCategory || record.isSummary ? 600 : 400,
          color: record.isSummary ? '#1890ff' : 'inherit',
        }}>
          {text}
        </span>
      ),
    },
    {
      title: 'Số tiền',
      dataIndex: 'soTien',
      key: 'soTien',
      width: 200,
      align: 'right',
      render: (value: number, record: PnLRow) => (
        <span style={{
          color: value < 0 ? '#ff4d4f' : value > 0 ? '#52c41a' : 'inherit',
          fontWeight: record.isCategory || record.isSummary ? 600 : 400,
        }}>
          {value !== 0 ? formatCurrency(value) : '-'}
        </span>
      ),
    },
  ];

  const currentYear = new Date().getFullYear();

  return (
    <div>
      <Breadcrumb
        items={[
          { href: '/', title: <><HomeOutlined /> Trang chủ</> },
          { title: 'Báo cáo' },
          { title: 'Lãi lỗ (P&L)' },
        ]}
        style={{ marginBottom: 16 }}
      />

      <FilterBar
        className="mb-3"
        filters={
          <Select
            value={selectedPeriod}
            onChange={setSelectedPeriod}
            style={{ width: 150 }}
            options={[
              { value: 'thangNay', label: 'Tháng này' },
              { value: 'thangTruoc', label: 'Tháng trước' },
              { value: 'luyKe', label: 'Lũy kế năm' },
            ]}
          />
        }
        actions={
          <>
            {canExport && (
              <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
                Xuất Excel
              </Button>
            )}
            <Button type="primary" icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Làm mới
            </Button>
          </>
        }
      />

      <Card
        title={
          <Space>
            <LineChartOutlined />
            <span>Báo cáo Lãi lỗ (P&L)</span>
            <Tag color="blue">Năm {currentYear}</Tag>
          </Space>
        }
      >
        {/* Summary Cards */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card size="small" className="stat-card stat-card-success">
              <Statistic
                title="Doanh thu"
                value={summary?.tongDoanhThu ?? 0}
                formatter={(val) => formatCurrencyShort(val as number)}
                valueStyle={{ color: '#1890ff' }}
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" className="stat-card stat-card-destructive">
              <Statistic
                title="Chi phí"
                value={summary?.tongChiPhi ?? 0}
                formatter={(val) => formatCurrencyShort(val as number)}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" className="stat-card stat-card-success">
              <Statistic
                title="LN trước thuế"
                value={summary?.loiNhuanTruocThue ?? 0}
                formatter={(val) => formatCurrencyShort(val as number)}
                valueStyle={{ color: (summary?.loiNhuanTruocThue ?? 0) >= 0 ? '#1890ff' : '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" className="stat-card stat-card-success">
              <Statistic
                title="LN sau thuế"
                value={summary?.loiNhuanSauThue ?? 0}
                formatter={(val) => formatCurrencyShort(val as number)}
                valueStyle={{ color: (summary?.loiNhuanSauThue ?? 0) >= 0 ? '#52c41a' : '#ff4d4f' }}
                prefix={(summary?.loiNhuanSauThue ?? 0) >= 0 ? <RiseOutlined /> : <FallOutlined />}
                suffix={<span style={{ fontSize: 12 }}>({(summary?.tyLeLoiNhuanRong ?? 0).toFixed(1)}%)</span>}
              />
            </Card>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={buildTableData()}
          rowKey="key"
          loading={loading}
          pagination={false}
          size="middle"
          bordered
          rowClassName={(record) =>
            record.isSummary ? 'bg-blue-50' : record.isCategory ? 'bg-gray-50' : ''
          }
        />
      </Card>
    </div>
  );
};

export default PnLPage;
