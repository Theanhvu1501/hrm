import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { KqkdChiTieu } from '@/services/kqkdService';

interface KqkdTableProps {
  data: KqkdChiTieu[];
  loading: boolean;
}

const formatNumber = (value: number): string => {
  if (value === 0) return '-';
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat('vi-VN').format(abs);
  return value < 0 ? `(${formatted})` : formatted;
};

const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  if (value === 0) return '-';
  const formatted = Math.abs(value).toFixed(1);
  return value < 0 ? `(${formatted}%)` : `${formatted}%`;
};

const numberCell = (v: number) => (
  <span style={{ color: v < 0 ? '#dc2626' : undefined }}>{formatNumber(v)}</span>
);

const columns: ColumnsType<KqkdChiTieu> = [
  {
    title: 'STT',
    key: 'stt',
    width: 50,
    align: 'center',
    render: (_v, _r, index) => index + 1,
  },
  {
    title: 'Chỉ tiêu',
    dataIndex: 'ten',
    key: 'ten',
    width: 240,
    render: (ten: string, row) => (
      <span style={{ paddingLeft: row.isCalculated ? 16 : 32 }}>{ten}</span>
    ),
  },
  { title: 'Mã số', dataIndex: 'ma', key: 'ma', width: 70, align: 'center' },
  {
    title: 'Kỳ hiện tại',
    children: [
      { title: 'Số tiền', dataIndex: 'kyHienTai', align: 'right', width: 120, render: numberCell },
      { title: '% DT thuần', dataIndex: 'phanTramDTThuan', align: 'right', width: 90, render: formatPercent },
      { title: 'Tỷ trọng CP', dataIndex: 'tyTrongChiPhi', align: 'right', width: 90, render: formatPercent },
    ],
  },
  {
    title: 'Kỳ trước',
    children: [
      { title: 'Số tiền', dataIndex: 'kyTruoc', align: 'right', width: 120, render: numberCell },
      { title: '% DT thuần', dataIndex: 'phanTramDTThuanKyTruoc', align: 'right', width: 90, render: formatPercent },
      { title: 'Tỷ trọng CP', dataIndex: 'tyTrongChiPhiKyTruoc', align: 'right', width: 90, render: formatPercent },
    ],
  },
  {
    title: 'Biến động',
    children: [
      { title: 'Số tiền', dataIndex: 'bienDong', align: 'right', width: 120, render: numberCell },
      {
        title: '%',
        dataIndex: 'phanTramBienDong',
        align: 'right',
        width: 80,
        render: (v: number | null) => (
          <span style={{ color: v !== null && v < 0 ? '#dc2626' : undefined }}>
            {formatPercent(v)}
          </span>
        ),
      },
    ],
  },
];

export function KqkdTable({ data, loading }: KqkdTableProps) {
  return (
    <Table<KqkdChiTieu>
      className="excel-table"
      columns={columns}
      dataSource={data}
      rowKey="ma"
      loading={loading}
      size="small"
      bordered
      pagination={false}
      scroll={{ x: 1200 }}
      rowClassName={(row) =>
        row.isBold || row.isCalculated ? 'kqkd-row-bold' : ''
      }
      locale={{ emptyText: 'Không có dữ liệu' }}
    />
  );
}
