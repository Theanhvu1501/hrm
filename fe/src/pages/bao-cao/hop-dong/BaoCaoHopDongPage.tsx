import React, { useEffect, useMemo, useState } from 'react';
import { Breadcrumb, Button, Card, Table, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { HomeOutlined, FileProtectOutlined, ExportOutlined } from '@ant-design/icons';
import type { BaoCaoHopDongRow } from '@/types';
import { theoDoiHopDongService } from '@/services/theoDoiHopDongService';
import { exportReportExcel } from '@/utils/exportReportExcel';
import { buildHopDongSheets } from './hopDongExport';
import { useTableColumnFilters } from '@/components/table/useTableColumnFilters';
import { filterHopDong } from './hopDongFilter';

const { Text, Title } = Typography;

const fmtCur = (v?: number) =>
  !v ? '-' : new Intl.NumberFormat('vi-VN').format(Math.round(v));
const fmtNum = (v?: number) => (v ? new Intl.NumberFormat('vi-VN').format(v) : '-');

export default function BaoCaoHopDongPage() {
  const [rows, setRows] = useState<BaoCaoHopDongRow[]>([]);
  const [tong, setTong] = useState<BaoCaoHopDongRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Lọc cột "Năm" + các cột số ở header: chạy trên dữ liệu gốc rồi cộng lại dòng Tổng theo các năm còn hiện.
  const { filters, filterable } = useTableColumnFilters('bao-cao-hop-dong');
  const view = useMemo(() => filterHopDong(rows, tong, filters), [rows, tong, filters]);

  const handleExport = async () => {
    // Xuất đúng phần đang lọc để file tải về khớp với cái đang xem trên màn hình.
    const sheets = buildHopDongSheets(view.rows, view.tong);
    if (sheets.length === 0) { message.warning('Không có dữ liệu để xuất'); return; }
    setExporting(true);
    try {
      await exportReportExcel('Bao cao hop dong', sheets);
      message.success('Đã xuất Excel');
    } catch (e) {
      console.error('export excel error', e);
      message.error('Xuất Excel thất bại');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    theoDoiHopDongService
      .getBaoCao()
      .then((res) => {
        setRows(res.rows);
        setTong(res.tong);
      })
      .catch(() => message.error('Không tải được báo cáo'))
      .finally(() => setLoading(false));
  }, []);

  const columns: ColumnsType<BaoCaoHopDongRow> = [
    filterable<BaoCaoHopDongRow>({
      title: 'Năm',
      dataIndex: 'nam',
      key: 'nam',
      width: 90,
      fixed: 'left',
      align: 'center',
      render: (v: number | null) => <Text strong>{v ?? 'Chưa rõ'}</Text>,
    }),
    {
      title: 'Giá trị Hợp đồng + phụ lục',
      children: [
        filterable<BaoCaoHopDongRow>(
          { title: 'Số lượng', dataIndex: 'soLuong', key: 'soLuong', width: 90, align: 'center', render: (v) => fmtNum(v) },
          { type: 'number' },
        ),
        filterable<BaoCaoHopDongRow>(
          { title: 'Số tiền', dataIndex: 'giaTri', key: 'giaTri', width: 160, align: 'right', render: (v) => fmtCur(v) },
          { type: 'number', filterTitle: 'Giá trị hợp đồng' },
        ),
      ],
    },
    filterable<BaoCaoHopDongRow>(
      { title: 'Quyết toán', dataIndex: 'quyetToan', key: 'quyetToan', width: 150, align: 'right', render: (v) => fmtCur(v) },
      { type: 'number' },
    ),
    filterable<BaoCaoHopDongRow>(
      {
        title: 'Thu tiền',
        dataIndex: 'thuTien',
        key: 'thuTien',
        width: 150,
        align: 'right',
        render: (v) => <Text type="success">{fmtCur(v)}</Text>,
      },
      { type: 'number' },
    ),
    {
      title: 'Tình trạng Hợp đồng',
      children: [
        filterable<BaoCaoHopDongRow>(
          { title: 'Chưa có HĐ', dataIndex: 'chuaCoHD', key: 'chuaCoHD', width: 90, align: 'center', render: (v) => fmtNum(v) },
          { type: 'number' },
        ),
        filterable<BaoCaoHopDongRow>(
          { title: 'HĐ chưa ký', dataIndex: 'hdChuaKy', key: 'hdChuaKy', width: 90, align: 'center', render: (v) => fmtNum(v) },
          { type: 'number' },
        ),
        filterable<BaoCaoHopDongRow>(
          { title: 'HĐ photo/scan', dataIndex: 'hdPhotoScan', key: 'hdPhotoScan', width: 100, align: 'center', render: (v) => fmtNum(v) },
          { type: 'number' },
        ),
        filterable<BaoCaoHopDongRow>(
          { title: 'HĐ gốc', dataIndex: 'hdGoc', key: 'hdGoc', width: 80, align: 'center', render: (v) => fmtNum(v) },
          { type: 'number' },
        ),
      ],
    },
    filterable<BaoCaoHopDongRow>(
      { title: 'Giá trị HĐ bình quân', dataIndex: 'giaTriBinhQuan', key: 'giaTriBinhQuan', width: 160, align: 'right', render: (v) => fmtCur(v) },
      { type: 'number' },
    ),
  ];

  return (
    <div className="space-y-3">
      <Breadcrumb
        items={[
          { href: '/', title: <><HomeOutlined /> Trang chủ</> },
          { title: 'Báo cáo' },
          { title: 'Báo cáo hợp đồng' },
        ]}
      />

      <Card className="shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileProtectOutlined className="text-primary" />
            <Title level={5} className="!mb-0">Báo cáo nhanh hợp đồng (theo năm)</Title>
          </div>
          <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
            Xuất Excel
          </Button>
        </div>

        <Table<BaoCaoHopDongRow>
          columns={columns}
          dataSource={view.rows}
          rowKey={(r) => String(r.nam ?? 'null')}
          loading={loading}
          size="small"
          bordered
          // scroll.x cố định → bảng cuộn ngang được, cột ghim (fixed) có tác dụng.
          scroll={{ x: 1200 }}
          pagination={false}
          summary={() => {
            const tongView = view.tong;
            return tongView ? (
              <Table.Summary fixed>
                <Table.Summary.Row className="font-semibold bg-gray-50">
                  <Table.Summary.Cell index={0} align="center"><Text strong>Tổng</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="center"><Text strong>{fmtNum(tongView.soLuong)}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right"><Text strong>{fmtCur(tongView.giaTri)}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right"><Text strong>{fmtCur(tongView.quyetToan)}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right"><Text strong type="success">{fmtCur(tongView.thuTien)}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="center"><Text strong>{fmtNum(tongView.chuaCoHD)}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="center"><Text strong>{fmtNum(tongView.hdChuaKy)}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="center"><Text strong>{fmtNum(tongView.hdPhotoScan)}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={8} align="center"><Text strong>{fmtNum(tongView.hdGoc)}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={9} align="right"><Text strong>{fmtCur(tongView.giaTriBinhQuan)}</Text></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null;
          }}
        />
      </Card>
    </div>
  );
}
