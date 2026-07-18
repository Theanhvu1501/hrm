import {
  hasActiveFilters,
  matchAllFilters,
  type ColumnFilters,
} from '@/components/table/columnFilter';
import type { SoDuTreeNode } from './buildSoDuTree';
import type { SoDuRow } from './chiTietConfig';

/**
 * Chữ hiển thị ở cột "Tài khoản / Đối tượng" (key = 'tk') của một node.
 * Node TK: "111 - Tiền mặt". Node đối tượng: "KH01 - Công ty A" (ô Select đang chọn).
 */
export function soDuNodeText(node: SoDuTreeNode): string {
  if (node.kind === 'account') return `${node.__ma} - ${node.ten}`;
  const row = node.row;
  if (!row) return '';
  return [row.chiTietMa, row.chiTietTen].filter(Boolean).join(' - ');
}

const getValue = (node: SoDuTreeNode, key: string): string | undefined =>
  key === 'tk' ? soDuNodeText(node) : undefined;

/** Cộng số của mọi dòng nhập (`row`) nằm trong các nhánh đưa vào. */
function sumRows(nodes: SoDuTreeNode[]): { duNo: number; duCo: number } {
  const acc = { duNo: 0, duCo: 0 };
  const walk = (n: SoDuTreeNode) => {
    if (n.row) {
      acc.duNo += n.row.duNo || 0;
      acc.duCo += n.row.duCo || 0;
    }
    for (const c of n.children ?? []) walk(c);
  };
  nodes.forEach(walk);
  return acc;
}

/** Mọi dòng nhập còn hiển thị sau khi lọc — dùng để cộng lại dòng TỔNG CỘNG. */
export function collectVisibleRows(nodes: SoDuTreeNode[]): SoDuRow[] {
  const out: SoDuRow[] = [];
  const walk = (n: SoDuTreeNode) => {
    if (n.row) out.push(n.row);
    for (const c of n.children ?? []) walk(c);
  };
  nodes.forEach(walk);
  return out;
}

/**
 * Lọc cây số dư đầu kỳ theo bộ lọc cột.
 *
 * - Node KHỚP → giữ nguyên cả nhánh con (lọc TK "112" thì vẫn thấy đủ các đối tượng của nó để nhập).
 * - Node không khớp nhưng còn con khớp → giữ làm dòng cha (cây không vỡ), và `__rollup` được
 *   CỘNG LẠI từ những con còn hiển thị (như SUBTOTAL của Excel), không giữ số tổng cũ.
 * - Node không khớp, không con nào khớp → bỏ.
 * Không có bộ lọc nào → trả nguyên cây gốc (giữ tham chiếu, tránh render lại thừa).
 */
export function filterSoDuTree(
  nodes: SoDuTreeNode[],
  filters: ColumnFilters,
): SoDuTreeNode[] {
  if (!hasActiveFilters(filters)) return nodes;

  const visit = (node: SoDuTreeNode): SoDuTreeNode | null => {
    if (matchAllFilters(node, filters, getValue)) return node;

    const children = (node.children ?? [])
      .map(visit)
      .filter((n): n is SoDuTreeNode => n !== null);
    if (children.length === 0) return null;

    return { ...node, children, __rollup: sumRows(children) };
  };

  return nodes.map(visit).filter((n): n is SoDuTreeNode => n !== null);
}
