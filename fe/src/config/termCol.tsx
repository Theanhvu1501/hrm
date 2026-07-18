import type { ColumnType } from 'antd/es/table';
import { TermText } from '@/components/glossary/TermText';

/**
 * Tạo cột antd với tiêu đề là nhãn động (TermText).
 * Dùng để nhân nhanh cột có title cấu hình theo lĩnh vực.
 */
export function termCol<T>(
  args: { tk: string; surface?: string } & ColumnType<T>,
): ColumnType<T> {
  const { tk, surface, ...col } = args;
  return { ...col, title: <TermText tk={tk} surface={surface} /> };
}
