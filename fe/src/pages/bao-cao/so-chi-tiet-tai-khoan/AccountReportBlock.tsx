import React, { useMemo } from 'react';
import { Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { SoChiTietReport } from '@/services/soChiTietTaiKhoanService';
import { buildDisplayRows, REGISTRY, type DisplayRow } from './columnRegistry';

const { Text } = Typography;

interface Props {
  /** Report ĐÃ lọc theo cột (trang lọc trước, ở đây chỉ dàn phẳng để hiển thị). */
  report: SoChiTietReport;
  /** Cột đã được trang gắn sẵn popover lọc + cố định (fixed) ở header. */
  columns: ColumnsType<DisplayRow>;
  visibleKeys: string[];
  scrollX: number;
  /** Chiều cao vùng cuộn của bảng — để ghim header + footer, chỉ cuộn nội dung. */
  scrollY?: number;
}

const AccountReportBlock: React.FC<Props> = ({
  report,
  columns,
  visibleKeys,
  scrollX,
  scrollY,
}) => {
  const allRows = useMemo(() => buildDisplayRows(report), [report]);

  // Nội dung cuộn: số dư đầu kỳ + các bút toán. Footer cố định: cộng phát sinh +
  // số dư cuối kỳ (ghim đáy qua Table.Summary).
  const dataSource = useMemo(
    () => allRows.filter((r) => r.kind === 'opening' || r.kind === 'entry'),
    [allRows],
  );
  const footerRows = useMemo(
    () => allRows.filter((r) => r.kind === 'cong' || r.kind === 'cuoi'),
    [allRows],
  );

  // Cột lá (đúng thứ tự REGISTRY-visible) để dựng ô footer khớp cột.
  const leafDefs = useMemo(
    () => REGISTRY.filter((c) => visibleKeys.includes(c.key)),
    [visibleKeys],
  );

  const hasColumns = columns.length > 0;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ marginBottom: 6 }}>
        <span>
          Tài khoản:{' '}
          <Text strong>
            {report.taiKhoan.ma} - {report.taiKhoan.ten}
          </Text>
        </span>
        {report.doiTuong && (
          <span style={{ marginLeft: 16 }}>
            Đối tượng:{' '}
            <Text strong>
              {report.doiTuong.ma
                ? `${report.doiTuong.ma} - ${report.doiTuong.ten}`
                : report.doiTuong.ten}
            </Text>
          </span>
        )}
      </div>
      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        size="small"
        bordered
        // scroll.x là số cố định (>= 1100) nên bảng luôn cuộn ngang được → cột ghim (fixed)
        // từ popover header có tác dụng, kể cả ở dòng footer (Table.Summary bám theo cột).
        scroll={{ x: scrollX, y: scrollY }}
        rowClassName={(r) => (r.kind === 'entry' ? '' : 'sct-summary-row')}
        summary={
          hasColumns
            ? () => (
                <Table.Summary fixed>
                  {footerRows.map((row) => (
                    <Table.Summary.Row key={row.key} className="sct-summary-row">
                      {leafDefs.map((c, idx) => {
                        const raw = (row as unknown as Record<string, unknown>)[c.dataIndex];
                        const content = c.render ? c.render(raw, row) : (raw as React.ReactNode) ?? '';
                        return (
                          <Table.Summary.Cell key={c.key} index={idx} align={c.align}>
                            {content}
                          </Table.Summary.Cell>
                        );
                      })}
                    </Table.Summary.Row>
                  ))}
                </Table.Summary>
              )
            : undefined
        }
      />
    </div>
  );
};

export default AccountReportBlock;
