import React, { useMemo } from 'react';
import { Card, Table, Skeleton, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { taxReportService } from '@/services/taxService';

interface Props {
  year: number;
}

interface FlatRow {
  key: string;
  isHeader?: boolean;
  tt: string;
  chiTieu: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  luyKe: number;
}

const nf = new Intl.NumberFormat('vi-VN');
const fmt = (v: number) => (v ? nf.format(v) : '');

// Dòng tổng/derived + chi phí không được trừ → in đậm.
const BOLD_ROWS = new Set([
  'Tổng CP phát sinh',
  'Lợi nhuận trước thuế',
  'Thu nhập tính thuế',
  'Lợi nhuận sau thuế',
  'Chi phí không được trừ',
]);
// Dòng chữ đỏ (đậm): "... phải nộp" + "Chi phí không được trừ".
const isRedRow = (chiTieu: string) =>
  chiTieu.includes('phải nộp') || chiTieu === 'Chi phí không được trừ';

const NghiaVuChinhSachTable: React.FC<Props> = ({ year }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['nvcs', year],
    queryFn: () => taxReportService.getNghiaVuChinhSach(year),
  });

  const dataSource = useMemo<FlatRow[]>(() => {
    if (!data?.sections) return [];
    const rows: FlatRow[] = [];
    data.sections.forEach((section) => {
      rows.push({
        key: `h-${section.ma}`,
        isHeader: true,
        tt: '',
        chiTieu: section.tieuDe,
        q1: 0,
        q2: 0,
        q3: 0,
        q4: 0,
        luyKe: 0,
      });
      section.rows.forEach((r, i) => {
        rows.push({ key: `${section.ma}-${i}`, ...r });
      });
    });
    return rows;
  }, [data]);

  const columns = useMemo<ColumnsType<FlatRow>>(() => {
    const numCol = (
      title: string,
      dataIndex: 'q1' | 'q2' | 'q3' | 'q4' | 'luyKe',
    ): ColumnsType<FlatRow>[number] => ({
      title,
      dataIndex,
      align: 'right',
      width: 120,
      render: (v: number, row) => (row.isHeader ? null : fmt(v)),
      onCell: (row) => (row.isHeader ? { colSpan: 0 } : {}),
    });

    return [
      {
        title: 'TT',
        dataIndex: 'tt',
        align: 'center',
        width: 48,
        onCell: (row) =>
          row.isHeader
            ? {
                colSpan: 7,
                style: { background: 'hsl(var(--muted) / 0.5)' },
              }
            : {},
        render: (v: string, row) =>
          row.isHeader ? (
            <span className="font-semibold">{row.chiTieu}</span>
          ) : (
            v
          ),
      },
      {
        title: 'CHỈ TIÊU',
        dataIndex: 'chiTieu',
        onCell: (row) => (row.isHeader ? { colSpan: 0 } : {}),
      },
      numCol('Quý 1', 'q1'),
      numCol('Quý 2', 'q2'),
      numCol('Quý 3', 'q3'),
      numCol('Quý 4', 'q4'),
      numCol('Lũy kế', 'luyKe'),
    ];
  }, []);

  return (
    <Card
      title={
        <span className="text-sm sm:text-base font-semibold">
          TÌNH HÌNH THỰC HIỆN NGHĨA VỤ CHÍNH SÁCH
        </span>
      }
      extra={
        <span className="text-[10px] sm:text-xs text-muted-foreground">
          Đvt: VND
        </span>
      }
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : dataSource.length === 0 ? (
        <Empty description="Chưa có dữ liệu" />
      ) : (
        <Table<FlatRow>
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          size="small"
          bordered
          scroll={{ x: 'max-content' }}
          onRow={(row) => {
            if (row.isHeader) return {};
            const red = isRedRow(row.chiTieu);
            const bold = red || BOLD_ROWS.has(row.chiTieu);
            if (!bold && !red) return {};
            return {
              style: {
                ...(bold ? { fontWeight: 600 } : {}),
                ...(red ? { color: '#cf1322' } : {}),
              },
            };
          }}
        />
      )}
    </Card>
  );
};

export default NghiaVuChinhSachTable;
