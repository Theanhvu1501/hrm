import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Statistic,
  Row,
  Col,
  Tabs,
  Alert,
  Progress,
  Tooltip,
  Breadcrumb
} from 'antd';
import {
  ReloadOutlined,
  ExportOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  HomeOutlined,
  DollarOutlined,
  ShopOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { 
  congNoPhaiTraService, 
  CongNoWithOverdue, 
  CongNoStats,
  CongNoSummaryBySupplier 
} from '@/services/congNoPhaiTraService';
import { FilterBar } from "@/components/common/FilterBar";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';
import { useTableColumnFilters } from '@/components/table/useTableColumnFilters';
import { chiTietValue, tongHopTraValue } from '../congNoCellValue';

const CongNoPhaiTraPage: React.FC = () => {
  const { canExport } = usePagePermission("/cong-no/phai-tra");
  const [data, setData] = useState<CongNoWithOverdue[]>([]);
  const [summaryData, setSummaryData] = useState<CongNoSummaryBySupplier[]>([]);
  const [agingData, setAgingData] = useState<{
    chuaDenHan: number;
    quaHan1_30: number;
    quaHan31_60: number;
    quaHan61_90: number;
    quaHanTren90: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [stats, setStats] = useState<CongNoStats | null>(null);
  const [activeTab, setActiveTab] = useState('1');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allData, statsData, summary, aging] = await Promise.all([
        congNoPhaiTraService.getAll(),
        congNoPhaiTraService.getStats(),
        congNoPhaiTraService.getSummaryBySupplier(),
        congNoPhaiTraService.getAgingReport()
      ]);
      setData(allData);
      setStats(statsData);
      setSummaryData(summary);
      setAgingData(aging);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = async () => {
    if (!searchText.trim()) {
      fetchData();
      return;
    }
    setLoading(true);
    try {
      const result = await congNoPhaiTraService.search(searchText);
      setData(result);
    } catch (error) {
      console.error('Error searching:', error);
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

  const getOverdueTag = (record: CongNoWithOverdue) => {
    switch (record.tinhTrangQuaHan) {
      case 'QUA_HAN_NGHIEM_TRONG':
        return <Tag color="red" icon={<ExclamationCircleOutlined />}>Quá hạn nghiêm trọng ({record.soNgayQuaHan} ngày)</Tag>;
      case 'QUA_HAN':
        return <Tag color="orange" icon={<WarningOutlined />}>Quá hạn ({record.soNgayQuaHan} ngày)</Tag>;
      case 'SAP_DEN_HAN':
        return <Tag color="gold" icon={<ClockCircleOutlined />}>Sắp đến hạn</Tag>;
      default:
        return <Tag color="green" icon={<CheckCircleOutlined />}>Chưa đến hạn</Tag>;
    }
  };

  const getStatusTag = (trangThai: string) => {
    switch (trangThai) {
      case 'DA_THU_DU':
        return <Tag color="success">Đã trả đủ</Tag>;
      case 'DA_THU_MOT_PHAN':
        return <Tag color="processing">Trả một phần</Tag>;
      default:
        return <Tag color="warning">Chưa trả</Tag>;
    }
  };

  // Lọc theo cột ở header — mỗi bảng 1 pageKey riêng để bộ lọc/cột ghim không dính vào nhau.
  const { filterable, matches, hasPinned } = useTableColumnFilters('cong-no-phai-tra-chi-tiet');
  const {
    filterable: filterableTH,
    matches: matchesTH,
    hasPinned: hasPinnedTH,
  } = useTableColumnFilters('cong-no-phai-tra-tong-hop');

  // Dữ liệu load hết về client → lọc client-side. Dòng tổng của bảng dùng `summary(pageData)`
  // nên tự cộng lại theo đúng những dòng còn hiển thị.
  const filteredData = data.filter(item => {
    if (!matches(item, chiTietValue)) return false;
    if (filterStatus === 'all') return true;
    if (filterStatus === 'overdue') {
      return item.tinhTrangQuaHan === 'QUA_HAN' || item.tinhTrangQuaHan === 'QUA_HAN_NGHIEM_TRONG';
    }
    if (filterStatus === 'pending') return item.trangThai !== 'DA_THU_DU';
    return true;
  });

  const filteredSummary = summaryData.filter(item => matchesTH(item, tongHopTraValue));

  const overdueItems = data.filter(item => 
    item.tinhTrangQuaHan === 'QUA_HAN' || item.tinhTrangQuaHan === 'QUA_HAN_NGHIEM_TRONG'
  );

  const columns: ColumnsType<CongNoWithOverdue> = [
    filterable<CongNoWithOverdue>({
      title: 'Mã NCC',
      dataIndex: 'doiTuongId',
      key: 'doiTuongId',
      width: 100,
      sorter: (a, b) => a.doiTuongId.localeCompare(b.doiTuongId),
    }),
    filterable<CongNoWithOverdue>({
      title: 'Nhà cung cấp',
      dataIndex: 'doiTuongTen',
      key: 'doiTuongTen',
      width: 220,
      ellipsis: true,
    }),
    {
      title: 'Ngày phát sinh',
      dataIndex: 'ngayPhatSinh',
      key: 'ngayPhatSinh',
      width: 120,
      render: (date: string) => date ? new Date(date).toLocaleDateString('vi-VN') : '-',
      sorter: (a, b) => a.ngayPhatSinh.localeCompare(b.ngayPhatSinh),
    },
    {
      title: 'Hạn thanh toán',
      dataIndex: 'hanThanhToan',
      key: 'hanThanhToan',
      width: 130,
      render: (date: string) => date ? new Date(date).toLocaleDateString('vi-VN') : '-',
      sorter: (a, b) => (a.hanThanhToan || '').localeCompare(b.hanThanhToan || ''),
    },
    filterable<CongNoWithOverdue>(
      {
        title: 'Số tiền gốc',
        dataIndex: 'soTienGoc',
        key: 'soTienGoc',
        width: 140,
        align: 'right',
        render: (value) => formatCurrency(value),
        sorter: (a, b) => a.soTienGoc - b.soTienGoc,
      },
      { type: 'number' },
    ),
    filterable<CongNoWithOverdue>(
      {
        title: 'Đã trả',
        dataIndex: 'daThu',
        key: 'daThu',
        width: 130,
        align: 'right',
        render: (value) => <span style={{ color: '#52c41a' }}>{formatCurrency(value)}</span>,
        sorter: (a, b) => a.daThu - b.daThu,
      },
      { type: 'number' },
    ),
    filterable<CongNoWithOverdue>(
      {
        title: 'Còn phải trả',
        dataIndex: 'conLai',
        key: 'conLai',
        width: 140,
        align: 'right',
        render: (value) => <span style={{ color: '#ff4d4f', fontWeight: 600 }}>{formatCurrency(value)}</span>,
        sorter: (a, b) => a.conLai - b.conLai,
      },
      { type: 'number' },
    ),
    {
      title: 'Tình trạng',
      key: 'tinhTrang',
      width: 200,
      render: (_, record) => getOverdueTag(record),
      filters: [
        { text: 'Quá hạn nghiêm trọng', value: 'QUA_HAN_NGHIEM_TRONG' },
        { text: 'Quá hạn', value: 'QUA_HAN' },
        { text: 'Sắp đến hạn', value: 'SAP_DEN_HAN' },
        { text: 'Chưa đến hạn', value: 'CHUA_DEN_HAN' },
      ],
      onFilter: (value, record) => record.tinhTrangQuaHan === value,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trangThai',
      key: 'trangThai',
      width: 120,
      render: (trangThai) => getStatusTag(trangThai),
      filters: [
        { text: 'Đã trả đủ', value: 'DA_THU_DU' },
        { text: 'Trả một phần', value: 'DA_THU_MOT_PHAN' },
        { text: 'Chưa trả', value: 'CHUA_THU' },
      ],
      onFilter: (value, record) => record.trangThai === value,
    },
  ];

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('congNo.phaiTra', columns);

  const summaryColumns: ColumnsType<CongNoSummaryBySupplier> = [
    filterableTH<CongNoSummaryBySupplier>({
      title: 'Mã NCC',
      dataIndex: 'doiTuongId',
      key: 'doiTuongId',
      width: 100,
    }),
    filterableTH<CongNoSummaryBySupplier>({
      title: 'Nhà cung cấp',
      dataIndex: 'doiTuongTen',
      key: 'doiTuongTen',
      width: 220,
      ellipsis: true,
    }),
    filterableTH<CongNoSummaryBySupplier>(
      {
        title: 'Số hóa đơn',
        dataIndex: 'soHoaDon',
        key: 'soHoaDon',
        width: 100,
        align: 'center',
      },
      { type: 'number' },
    ),
    filterableTH<CongNoSummaryBySupplier>(
      {
        title: 'Tổng nợ',
        dataIndex: 'tongNo',
        key: 'tongNo',
        width: 150,
        align: 'right',
        render: (value) => formatCurrency(value),
        sorter: (a, b) => a.tongNo - b.tongNo,
      },
      { type: 'number' },
    ),
    filterableTH<CongNoSummaryBySupplier>(
      {
        title: 'Đã trả',
        dataIndex: 'daTra',
        key: 'daTra',
        width: 140,
        align: 'right',
        render: (value) => <span style={{ color: '#52c41a' }}>{formatCurrency(value)}</span>,
      },
      { type: 'number' },
    ),
    filterableTH<CongNoSummaryBySupplier>(
      {
        title: 'Còn lại',
        dataIndex: 'conLai',
        key: 'conLai',
        width: 150,
        align: 'right',
        render: (value) => <span style={{ color: '#1890ff', fontWeight: 600 }}>{formatCurrency(value)}</span>,
        sorter: (a, b) => a.conLai - b.conLai,
      },
      { type: 'number' },
    ),
    filterableTH<CongNoSummaryBySupplier>(
      {
        title: 'Nợ quá hạn',
        dataIndex: 'quaHan',
        key: 'quaHan',
        width: 150,
        align: 'right',
        render: (value) => value > 0
          ? <span style={{ color: '#ff4d4f', fontWeight: 600 }}>{formatCurrency(value)}</span>
          : <span style={{ color: '#52c41a' }}>-</span>,
        sorter: (a, b) => a.quaHan - b.quaHan,
      },
      { type: 'number' },
    ),
    filterableTH<CongNoSummaryBySupplier>(
      {
        title: 'Tỷ lệ trả',
        key: 'tyLeTra',
        width: 150,
        render: (_, record) => {
          const percent = record.tongNo > 0 ? Math.round((record.daTra / record.tongNo) * 100) : 0;
          return (
            <Tooltip title={`${percent}% đã trả`}>
              <Progress
                percent={percent}
                size="small"
                status={percent === 100 ? 'success' : 'active'}
              />
            </Tooltip>
          );
        },
      },
      { type: 'number', filterTitle: 'Tỷ lệ trả (%)' },
    ),
  ];

  const tabItems = [
    {
      key: '1',
      label: 'Chi tiết công nợ',
      children: (
        <>
          {stats && stats.soKhoanQuaHan > 0 && (
            <Alert
              message={`Cảnh báo: Có ${stats.soKhoanQuaHan} khoản công nợ quá hạn cần thanh toán với tổng số tiền ${formatCurrency(agingData ? (agingData.quaHan1_30 + agingData.quaHan31_60 + agingData.quaHan61_90 + agingData.quaHanTren90) : 0)}`}
              type="error"
              showIcon
              icon={<WarningOutlined />}
              style={{ marginBottom: 16 }}
              action={
                <Button 
                  size="small" 
                  type="primary" 
                  danger
                  onClick={() => setFilterStatus('overdue')}
                >
                  Xem quá hạn
                </Button>
              }
            />
          )}
          
          <Space style={{ marginBottom: 16 }}>
            <Button 
              type={filterStatus === 'all' ? 'primary' : 'default'}
              onClick={() => setFilterStatus('all')}
            >
              Tất cả ({data.length})
            </Button>
            <Button 
              type={filterStatus === 'pending' ? 'primary' : 'default'}
              onClick={() => setFilterStatus('pending')}
            >
              Còn phải trả ({data.filter(d => d.trangThai !== 'DA_THU_DU').length})
            </Button>
            <Button 
              type={filterStatus === 'overdue' ? 'primary' : 'default'}
              danger={filterStatus === 'overdue'}
              onClick={() => setFilterStatus('overdue')}
            >
              Quá hạn ({overdueItems.length})
            </Button>
          </Space>

          <Table
            columns={cfgColumns}
            dataSource={filteredData}
            rowKey="id"
            loading={loading}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} bản ghi`,
            }}
            size="middle"
            // Cột ghim (fixed) chỉ có tác dụng khi bảng cuộn ngang được → cần scroll.x.
            scroll={{ x: hasPinned ? 'max-content' : 1300 }}
            summary={(pageData) => {
              const totalGoc = pageData.reduce((sum, item) => sum + item.soTienGoc, 0);
              const totalDaTra = pageData.reduce((sum, item) => sum + item.daThu, 0);
              const totalConLai = pageData.reduce((sum, item) => sum + item.conLai, 0);
              return (
                <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 600 }}>
                  <Table.Summary.Cell index={0} colSpan={4}>Tổng trang hiện tại</Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">{formatCurrency(totalGoc)}</Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right"><span style={{ color: '#52c41a' }}>{formatCurrency(totalDaTra)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right"><span style={{ color: '#ff4d4f' }}>{formatCurrency(totalConLai)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} colSpan={2}></Table.Summary.Cell>
                </Table.Summary.Row>
              );
            }}
          />
        </>
      ),
    },
    {
      key: '2',
      label: 'Tổng hợp theo NCC',
      children: (
        <Table
          columns={summaryColumns}
          dataSource={filteredSummary}
          rowKey="doiTuongId"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} nhà cung cấp`,
          }}
          size="middle"
          scroll={{ x: hasPinnedTH ? 'max-content' : 1200 }}
          summary={(pageData) => {
            const totalNo = pageData.reduce((sum, item) => sum + item.tongNo, 0);
            const totalDaTra = pageData.reduce((sum, item) => sum + item.daTra, 0);
            const totalConLai = pageData.reduce((sum, item) => sum + item.conLai, 0);
            const totalQuaHan = pageData.reduce((sum, item) => sum + item.quaHan, 0);
            return (
              <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 600 }}>
                <Table.Summary.Cell index={0} colSpan={3}>Tổng cộng</Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">{formatCurrency(totalNo)}</Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right"><span style={{ color: '#52c41a' }}>{formatCurrency(totalDaTra)}</span></Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right"><span style={{ color: '#1890ff' }}>{formatCurrency(totalConLai)}</span></Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right"><span style={{ color: '#ff4d4f' }}>{formatCurrency(totalQuaHan)}</span></Table.Summary.Cell>
                <Table.Summary.Cell index={5}></Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      ),
    },
    {
      key: '3',
      label: 'Phân tích tuổi nợ',
      children: agingData && (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Chưa đến hạn"
                value={agingData.chuaDenHan}
                precision={0}
                formatter={(value) => formatCurrency(value as number)}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Quá hạn 1-30 ngày"
                value={agingData.quaHan1_30}
                precision={0}
                formatter={(value) => formatCurrency(value as number)}
                valueStyle={{ color: '#faad14' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Quá hạn 31-60 ngày"
                value={agingData.quaHan31_60}
                precision={0}
                formatter={(value) => formatCurrency(value as number)}
                valueStyle={{ color: '#fa8c16' }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Quá hạn 61-90 ngày"
                value={agingData.quaHan61_90}
                precision={0}
                formatter={(value) => formatCurrency(value as number)}
                valueStyle={{ color: '#f5222d' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Quá hạn trên 90 ngày"
                value={agingData.quaHanTren90}
                precision={0}
                formatter={(value) => formatCurrency(value as number)}
                valueStyle={{ color: '#a8071a' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Tổng nợ quá hạn"
                value={agingData.quaHan1_30 + agingData.quaHan31_60 + agingData.quaHan61_90 + agingData.quaHanTren90}
                precision={0}
                formatter={(value) => formatCurrency(value as number)}
                valueStyle={{ color: '#cf1322' }}
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item href="/">
          <HomeOutlined />
        </Breadcrumb.Item>
        <Breadcrumb.Item>Công nợ</Breadcrumb.Item>
        <Breadcrumb.Item>Phải trả</Breadcrumb.Item>
      </Breadcrumb>

      <FilterBar
        search={{
          value: searchText,
          onChange: setSearchText,
          onSearch: handleSearch,
          placeholder: "Tìm theo tên, mã NCC...",
        }}
        actions={
          <>
            {settingsButton}
            {canExport && <Button icon={<ExportOutlined />}>Xuất Excel</Button>}
            <Button type="primary" icon={<ReloadOutlined />} onClick={fetchData}>
              Làm mới
            </Button>
          </>
        }
      />

      <Card
        title={
          <Space>
            <ShopOutlined />
            <span>Công nợ phải trả</span>
          </Space>
        }
      >
        {/* Stats Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={4}>
            <Card size="small" className="stat-card">
              <Statistic
                title="Số khoản nợ"
                value={stats?.soKhoanNo || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card size="small" className="stat-card">
              <Statistic
                title="Tổng công nợ"
                value={stats?.tongCongNo || 0}
                precision={0}
                formatter={(value) => formatCurrency(value as number)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card size="small" className="stat-card stat-card-success">
              <Statistic
                title="Đã trả"
                value={stats?.daThu || 0}
                precision={0}
                formatter={(value) => formatCurrency(value as number)}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card size="small" className="stat-card stat-card-destructive">
              <Statistic
                title="Còn phải trả"
                value={stats?.conLai || 0}
                precision={0}
                formatter={(value) => formatCurrency(value as number)}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card size="small" className="stat-card stat-card-destructive">
              <Statistic
                title="Số khoản quá hạn"
                value={stats?.soKhoanQuaHan || 0}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card size="small" className="stat-card stat-card-destructive">
              <Statistic
                title="Tổng nợ quá hạn"
                value={agingData ? (agingData.quaHan1_30 + agingData.quaHan31_60 + agingData.quaHan61_90 + agingData.quaHanTren90) : 0}
                precision={0}
                formatter={(value) => formatCurrency(value as number)}
                valueStyle={{ color: '#ff4d4f' }}
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

export default CongNoPhaiTraPage;
