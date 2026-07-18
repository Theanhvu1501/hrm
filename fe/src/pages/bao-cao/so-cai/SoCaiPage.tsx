import React, { useState, useEffect, useMemo } from 'react';
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
  Descriptions,
  Empty,
  message
} from 'antd';
import { 
  ReloadOutlined, 
  ExportOutlined,
  HomeOutlined,
  BookOutlined,
  CheckCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { 
  soCaiService, 
  SoCaiByAccount, 
  SoCaiEntry,
  SoCaiStats,
  TrialBalance
} from '@/services/soCaiService';
import { taiKhoanService } from '@/services/taiKhoanService';
import { usePagePermission } from "@/hooks/usePagePermission";
import { FilterBar } from "@/components/common/FilterBar";
import { useTableColumnFilters } from "@/components/table/useTableColumnFilters";
import { exportReportExcel } from "@/utils/exportReportExcel";
import { buildSoCaiSheets } from "./soCaiExport";
import { filterSoCaiChiTiet, filterSoCaiSummary, filterTrialBalance } from "./soCaiFilter";

const SoCaiPage: React.FC = () => {
  const { canExport } = usePagePermission("/bao-cao/so-cai");
  const [summaryData, setSummaryData] = useState<SoCaiByAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<SoCaiByAccount | null>(null);
  const [trialBalance, setTrialBalance] = useState<TrialBalance[]>([]);
  const [accountOptions, setAccountOptions] = useState<{ value: string; label: string }[]>([]);
  const [stats, setStats] = useState<SoCaiStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('1');
  const [filterAccount, setFilterAccount] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  // Mỗi bảng một bộ lọc riêng: 3 tab trùng key cột (taiKhoan/tenTaiKhoan) nên phải tách pageKey,
  // không thì lọc/ghim ở tab này lại ăn sang tab kia.
  const summaryFilters = useTableColumnFilters('bao-cao-so-cai-tong-hop');
  const detailFilters = useTableColumnFilters('bao-cao-so-cai-chi-tiet');
  const trialFilters = useTableColumnFilters('bao-cao-so-cai-can-doi-ps');

  // Lọc trên dữ liệu gốc rồi mới đưa vào bảng: dòng Tổng cộng / khối tổng của tab chi tiết được
  // cộng lại theo đúng những dòng còn hiển thị.
  const summaryView = useMemo(
    () => filterSoCaiSummary(summaryData, summaryFilters.filters),
    [summaryData, summaryFilters.filters],
  );
  const detailView = useMemo(
    () => filterSoCaiChiTiet(selectedAccount, detailFilters.filters),
    [selectedAccount, detailFilters.filters],
  );
  const trialView = useMemo(
    () => filterTrialBalance(trialBalance, trialFilters.filters),
    [trialBalance, trialFilters.filters],
  );

  const handleExport = async () => {
    // Xuất đúng phần đang lọc để file tải về khớp với cái đang xem trên màn hình.
    const sheets = buildSoCaiSheets(activeTab, {
      summaryData: summaryView,
      selectedAccount: detailView,
      trialBalance: trialView,
    });
    if (sheets.length === 0) { message.warning("Không có dữ liệu để xuất (tab hiện tại)"); return; }
    setExporting(true);
    try {
      await exportReportExcel("So cai", sheets);
      message.success("Đã xuất Excel");
    } catch (e) {
      console.error("export excel error", e);
      message.error("Xuất Excel thất bại");
    } finally {
      setExporting(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summary, trial, statsData, accounts] = await Promise.all([
        soCaiService.getSummaryByAccount(),
        soCaiService.getTrialBalance(),
        soCaiService.getStats(),
        taiKhoanService.getAll()
      ]);
      setSummaryData(summary);
      setTrialBalance(trial);
      setStats(statsData);
      setAccountOptions(accounts.map(tk => ({
        value: tk.ma,
        label: `${tk.ma} - ${tk.ten}`,
      })));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAccountSelect = async (taiKhoan: string) => {
    if (!taiKhoan) {
      setSelectedAccount(null);
      return;
    }
    setLoading(true);
    try {
      const data = await soCaiService.getByAccount(taiKhoan);
      setSelectedAccount(data);
      setFilterAccount(taiKhoan);
    } catch (error) {
      console.error('Error fetching account data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND',
      maximumFractionDigits: 0 
    }).format(value);
  };

  const detailColumns: ColumnsType<SoCaiEntry> = [
    {
      title: 'Ngày',
      dataIndex: 'ngay',
      key: 'ngay',
      width: 100,
    },
    detailFilters.filterable<SoCaiEntry>({
      title: 'Số chứng từ',
      dataIndex: 'soPhieu',
      key: 'soPhieu',
      width: 120,
    }),
    detailFilters.filterable<SoCaiEntry>({
      title: 'Loại CT',
      dataIndex: 'loaiChungTu',
      key: 'loaiChungTu',
      width: 100,
      render: (loai: string) => (
        <Tag color={loai === 'Phiếu thu' ? 'green' : 'red'}>{loai}</Tag>
      ),
    }),
    detailFilters.filterable<SoCaiEntry>({
      title: 'Diễn giải',
      dataIndex: 'dienGiai',
      key: 'dienGiai',
      ellipsis: true,
    }),
    detailFilters.filterable<SoCaiEntry>(
      {
        title: 'Phát sinh Nợ',
        dataIndex: 'phatSinhNo',
        key: 'phatSinhNo',
        width: 140,
        align: 'right',
        render: (value) => value > 0 ? formatCurrency(value) : '-',
      },
      { type: 'number' },
    ),
    detailFilters.filterable<SoCaiEntry>(
      {
        title: 'Phát sinh Có',
        dataIndex: 'phatSinhCo',
        key: 'phatSinhCo',
        width: 140,
        align: 'right',
        render: (value) => value > 0 ? formatCurrency(value) : '-',
      },
      { type: 'number' },
    ),
    detailFilters.filterable<SoCaiEntry>(
      {
        title: 'Số dư Nợ',
        dataIndex: 'soDuNo',
        key: 'soDuNo',
        width: 140,
        align: 'right',
        render: (value) => value > 0 ? <span style={{ color: '#1890ff' }}>{formatCurrency(value)}</span> : '-',
      },
      { type: 'number' },
    ),
    detailFilters.filterable<SoCaiEntry>(
      {
        title: 'Số dư Có',
        dataIndex: 'soDuCo',
        key: 'soDuCo',
        width: 140,
        align: 'right',
        render: (value) => value > 0 ? <span style={{ color: '#52c41a' }}>{formatCurrency(value)}</span> : '-',
      },
      { type: 'number' },
    ),
  ];

  const summaryColumns: ColumnsType<SoCaiByAccount> = [
    summaryFilters.filterable<SoCaiByAccount>({
      title: 'Tài khoản',
      dataIndex: 'taiKhoan',
      key: 'taiKhoan',
      width: 100,
      sorter: (a: SoCaiByAccount, b: SoCaiByAccount) => a.taiKhoan.localeCompare(b.taiKhoan),
    }),
    summaryFilters.filterable<SoCaiByAccount>({
      title: 'Tên tài khoản',
      dataIndex: 'tenTaiKhoan',
      key: 'tenTaiKhoan',
      width: 200,
      ellipsis: true,
    }),
    summaryFilters.filterable<SoCaiByAccount>(
      {
        title: 'Số dư đầu kỳ Nợ',
        dataIndex: 'soDuDauKyNo',
        key: 'soDuDauKyNo',
        width: 140,
        align: 'right',
        render: (value) => value > 0 ? formatCurrency(value) : '-',
      },
      { type: 'number' },
    ),
    summaryFilters.filterable<SoCaiByAccount>(
      {
        title: 'Số dư đầu kỳ Có',
        dataIndex: 'soDuDauKyCo',
        key: 'soDuDauKyCo',
        width: 140,
        align: 'right',
        render: (value) => value > 0 ? formatCurrency(value) : '-',
      },
      { type: 'number' },
    ),
    summaryFilters.filterable<SoCaiByAccount>(
      {
        title: 'Phát sinh Nợ',
        dataIndex: 'phatSinhNo',
        key: 'phatSinhNo',
        width: 140,
        align: 'right',
        render: (value) => value > 0 ? <span style={{ color: '#1890ff' }}>{formatCurrency(value)}</span> : '-',
        sorter: (a, b) => a.phatSinhNo - b.phatSinhNo,
      },
      { type: 'number' },
    ),
    summaryFilters.filterable<SoCaiByAccount>(
      {
        title: 'Phát sinh Có',
        dataIndex: 'phatSinhCo',
        key: 'phatSinhCo',
        width: 140,
        align: 'right',
        render: (value) => value > 0 ? <span style={{ color: '#52c41a' }}>{formatCurrency(value)}</span> : '-',
        sorter: (a, b) => a.phatSinhCo - b.phatSinhCo,
      },
      { type: 'number' },
    ),
    summaryFilters.filterable<SoCaiByAccount>(
      {
        title: 'Số dư cuối kỳ Nợ',
        dataIndex: 'soDuCuoiKyNo',
        key: 'soDuCuoiKyNo',
        width: 140,
        align: 'right',
        render: (value) => value > 0 ? <span style={{ fontWeight: 600, color: '#1890ff' }}>{formatCurrency(value)}</span> : '-',
      },
      { type: 'number' },
    ),
    summaryFilters.filterable<SoCaiByAccount>(
      {
        title: 'Số dư cuối kỳ Có',
        dataIndex: 'soDuCuoiKyCo',
        key: 'soDuCuoiKyCo',
        width: 140,
        align: 'right',
        render: (value) => value > 0 ? <span style={{ fontWeight: 600, color: '#52c41a' }}>{formatCurrency(value)}</span> : '-',
      },
      { type: 'number' },
    ),
    {
      title: 'Chi tiết',
      key: 'action',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Button 
          type="link" 
          size="small"
          onClick={() => {
            handleAccountSelect(record.taiKhoan);
            setActiveTab('2');
          }}
        >
          Xem
        </Button>
      ),
    },
  ];

  const trialBalanceColumns: ColumnsType<TrialBalance> = [
    trialFilters.filterable<TrialBalance>({
      title: 'TK',
      dataIndex: 'taiKhoan',
      key: 'taiKhoan',
      width: 80,
      fixed: 'left',
    }),
    trialFilters.filterable<TrialBalance>({
      title: 'Tên tài khoản',
      dataIndex: 'tenTaiKhoan',
      key: 'tenTaiKhoan',
      width: 180,
      ellipsis: true,
      fixed: 'left',
    }),
    {
      title: 'Số dư đầu kỳ',
      children: [
        trialFilters.filterable<TrialBalance>(
          {
            title: 'Nợ',
            dataIndex: 'soDuDauKyNo',
            key: 'soDuDauKyNo',
            width: 120,
            align: 'right',
            render: (value) => value > 0 ? formatCurrency(value) : '-',
          },
          { type: 'number', filterTitle: 'Đầu kỳ Nợ' },
        ),
        trialFilters.filterable<TrialBalance>(
          {
            title: 'Có',
            dataIndex: 'soDuDauKyCo',
            key: 'soDuDauKyCo',
            width: 120,
            align: 'right',
            render: (value) => value > 0 ? formatCurrency(value) : '-',
          },
          { type: 'number', filterTitle: 'Đầu kỳ Có' },
        ),
      ],
    },
    {
      title: 'Phát sinh trong kỳ',
      children: [
        trialFilters.filterable<TrialBalance>(
          {
            title: 'Nợ',
            dataIndex: 'phatSinhNo',
            key: 'phatSinhNo',
            width: 130,
            align: 'right',
            render: (value) => value > 0 ? <span style={{ color: '#1890ff' }}>{formatCurrency(value)}</span> : '-',
          },
          { type: 'number', filterTitle: 'Phát sinh Nợ' },
        ),
        trialFilters.filterable<TrialBalance>(
          {
            title: 'Có',
            dataIndex: 'phatSinhCo',
            key: 'phatSinhCo',
            width: 130,
            align: 'right',
            render: (value) => value > 0 ? <span style={{ color: '#52c41a' }}>{formatCurrency(value)}</span> : '-',
          },
          { type: 'number', filterTitle: 'Phát sinh Có' },
        ),
      ],
    },
    {
      title: 'Số dư cuối kỳ',
      children: [
        trialFilters.filterable<TrialBalance>(
          {
            title: 'Nợ',
            dataIndex: 'soDuCuoiKyNo',
            key: 'soDuCuoiKyNo',
            width: 130,
            align: 'right',
            render: (value) => value > 0 ? <span style={{ fontWeight: 600 }}>{formatCurrency(value)}</span> : '-',
          },
          { type: 'number', filterTitle: 'Cuối kỳ Nợ' },
        ),
        trialFilters.filterable<TrialBalance>(
          {
            title: 'Có',
            dataIndex: 'soDuCuoiKyCo',
            key: 'soDuCuoiKyCo',
            width: 130,
            align: 'right',
            render: (value) => value > 0 ? <span style={{ fontWeight: 600 }}>{formatCurrency(value)}</span> : '-',
          },
          { type: 'number', filterTitle: 'Cuối kỳ Có' },
        ),
      ],
    },
  ];

  const tabItems = [
    {
      key: '1',
      label: 'Tổng hợp theo TK',
      children: (
        <Table
          columns={summaryColumns}
          dataSource={summaryView}
          rowKey="taiKhoan"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} tài khoản`,
          }}
          size="middle"
          // Cột ghim (fixed) chỉ có tác dụng khi bảng cuộn ngang được → cần scroll.x.
          scroll={{ x: summaryFilters.hasPinned ? 'max-content' : 1400 }}
          summary={(pageData) => {
            // Lọc không còn dòng nào → bỏ luôn dòng Tổng cộng toàn số 0.
            if (pageData.length === 0) return null;

            const totals = pageData.reduce((acc, item) => ({
              soDuDauKyNo: acc.soDuDauKyNo + item.soDuDauKyNo,
              soDuDauKyCo: acc.soDuDauKyCo + item.soDuDauKyCo,
              phatSinhNo: acc.phatSinhNo + item.phatSinhNo,
              phatSinhCo: acc.phatSinhCo + item.phatSinhCo,
              soDuCuoiKyNo: acc.soDuCuoiKyNo + item.soDuCuoiKyNo,
              soDuCuoiKyCo: acc.soDuCuoiKyCo + item.soDuCuoiKyCo,
            }), { soDuDauKyNo: 0, soDuDauKyCo: 0, phatSinhNo: 0, phatSinhCo: 0, soDuCuoiKyNo: 0, soDuCuoiKyCo: 0 });
            
            return (
              <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 600 }}>
                <Table.Summary.Cell index={0} colSpan={2}>Tổng cộng</Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">{formatCurrency(totals.soDuDauKyNo)}</Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">{formatCurrency(totals.soDuDauKyCo)}</Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right"><span style={{ color: '#1890ff' }}>{formatCurrency(totals.phatSinhNo)}</span></Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right"><span style={{ color: '#52c41a' }}>{formatCurrency(totals.phatSinhCo)}</span></Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">{formatCurrency(totals.soDuCuoiKyNo)}</Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">{formatCurrency(totals.soDuCuoiKyCo)}</Table.Summary.Cell>
                <Table.Summary.Cell index={7}></Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      ),
    },
    {
      key: '2',
      label: 'Chi tiết tài khoản',
      children: (
        <>
          {detailView ? (
            <>
              <Descriptions bordered size="small" column={4} style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Tài khoản" span={2}>
                  <strong>{detailView.taiKhoan} - {detailView.tenTaiKhoan}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="Số dư đầu kỳ Nợ">
                  {formatCurrency(detailView.soDuDauKyNo)}
                </Descriptions.Item>
                <Descriptions.Item label="Số dư đầu kỳ Có">
                  {formatCurrency(detailView.soDuDauKyCo)}
                </Descriptions.Item>
                <Descriptions.Item label="Phát sinh Nợ">
                  <span style={{ color: '#1890ff', fontWeight: 600 }}>{formatCurrency(detailView.phatSinhNo)}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Phát sinh Có">
                  <span style={{ color: '#52c41a', fontWeight: 600 }}>{formatCurrency(detailView.phatSinhCo)}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Số dư cuối kỳ Nợ">
                  <strong>{formatCurrency(detailView.soDuCuoiKyNo)}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="Số dư cuối kỳ Có">
                  <strong>{formatCurrency(detailView.soDuCuoiKyCo)}</strong>
                </Descriptions.Item>
              </Descriptions>

              <Table
                columns={detailColumns}
                dataSource={detailView.chiTiet}
                rowKey={(record, index) => `${record.soPhieu}-${index}`}
                loading={loading}
                pagination={{
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} bút toán`,
                }}
                size="middle"
                scroll={{ x: detailFilters.hasPinned ? 'max-content' : 1200 }}
              />
            </>
          ) : (
            <Empty description="Vui lòng chọn tài khoản để xem chi tiết" />
          )}
        </>
      ),
    },
    {
      key: '3',
      label: 'Bảng cân đối phát sinh',
      children: (
        <Table
          columns={trialBalanceColumns}
          dataSource={trialView}
          rowKey="taiKhoan"
          loading={loading}
          pagination={false}
          size="middle"
          scroll={{ x: trialFilters.hasPinned ? 'max-content' : 1100 }}
          bordered
          summary={(pageData) => {
            // Lọc không còn dòng nào → bỏ luôn dòng Tổng cộng toàn số 0.
            if (pageData.length === 0) return null;

            const totals = pageData.reduce((acc, item) => ({
              soDuDauKyNo: acc.soDuDauKyNo + item.soDuDauKyNo,
              soDuDauKyCo: acc.soDuDauKyCo + item.soDuDauKyCo,
              phatSinhNo: acc.phatSinhNo + item.phatSinhNo,
              phatSinhCo: acc.phatSinhCo + item.phatSinhCo,
              soDuCuoiKyNo: acc.soDuCuoiKyNo + item.soDuCuoiKyNo,
              soDuCuoiKyCo: acc.soDuCuoiKyCo + item.soDuCuoiKyCo,
            }), { soDuDauKyNo: 0, soDuDauKyCo: 0, phatSinhNo: 0, phatSinhCo: 0, soDuCuoiKyNo: 0, soDuCuoiKyCo: 0 });
            
            const isBalanced = Math.abs(totals.phatSinhNo - totals.phatSinhCo) < 1;
            
            return (
              <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 600 }}>
                <Table.Summary.Cell index={0} colSpan={2}>
                  Tổng cộng {isBalanced 
                    ? <Tag color="success" icon={<CheckCircleOutlined />}>Cân đối</Tag>
                    : <Tag color="error" icon={<WarningOutlined />}>Không cân đối</Tag>
                  }
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">{formatCurrency(totals.soDuDauKyNo)}</Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">{formatCurrency(totals.soDuDauKyCo)}</Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right"><span style={{ color: '#1890ff' }}>{formatCurrency(totals.phatSinhNo)}</span></Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right"><span style={{ color: '#52c41a' }}>{formatCurrency(totals.phatSinhCo)}</span></Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">{formatCurrency(totals.soDuCuoiKyNo)}</Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">{formatCurrency(totals.soDuCuoiKyCo)}</Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      ),
    },
  ];

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item href="/">
          <HomeOutlined />
        </Breadcrumb.Item>
        <Breadcrumb.Item>Báo cáo</Breadcrumb.Item>
        <Breadcrumb.Item>Sổ cái</Breadcrumb.Item>
      </Breadcrumb>

      <FilterBar
        className="mb-3"
        filters={
          <Select
            showSearch
            placeholder="Chọn tài khoản"
            value={filterAccount || undefined}
            onChange={handleAccountSelect}
            options={accountOptions}
            style={{ width: 350 }}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            allowClear
          />
        }
        actions={
          <>
            {canExport && <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>Xuất Excel</Button>}
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              Làm mới
            </Button>
          </>
        }
      />

      <Card
        title={
          <Space>
            <BookOutlined />
            <span>Sổ cái tài khoản</span>
            <Tag color="blue">Kỳ hiện tại</Tag>
          </Space>
        }
      >
        {/* Stats Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" className="stat-card">
              <Statistic
                title="Số tài khoản"
                value={stats?.soTaiKhoan || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" className="stat-card stat-card-destructive">
              <Statistic
                title="Tổng phát sinh Nợ"
                value={stats?.tongPhatSinhNo || 0}
                precision={0}
                formatter={(value) => formatCurrency(value as number)}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" className="stat-card stat-card-success">
              <Statistic
                title="Tổng phát sinh Có"
                value={stats?.tongPhatSinhCo || 0}
                precision={0}
                formatter={(value) => formatCurrency(value as number)}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" className="stat-card">
              <Statistic
                title="Trạng thái cân đối"
                value={stats?.canDoi ? 'Cân đối' : 'Không cân đối'}
                valueStyle={{ color: stats?.canDoi ? '#52c41a' : '#ff4d4f' }}
                prefix={stats?.canDoi ? <CheckCircleOutlined /> : <WarningOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>
    </div>
  );
};

export default SoCaiPage;
