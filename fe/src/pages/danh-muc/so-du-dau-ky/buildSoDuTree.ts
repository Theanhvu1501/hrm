import type { ChiTietLoai, SoDuRow } from './chiTietConfig';

export interface SoDuTreeNode {
  __key: string;
  __ma: string;
  __isParent: boolean;
  __rollup: { duNo: number; duCo: number };
  ten: string;
  kind: 'account' | 'object';
  chiTietTheo?: ChiTietLoai;
  row?: SoDuRow;
  children?: SoDuTreeNode[];
}

export interface ChartAccount {
  ma: string;
  ten: string;
}

/**
 * Dựng cây Số dư đầu kỳ từ danh sách lá phẳng + chart đầy đủ.
 *
 * Hợp đồng đọc số liệu cho consumer:
 * - Node cha / node nhóm (`__isParent === true`): đọc tổng ở `__rollup` (read-only).
 * - Lá nhập (`__isParent === false`, có `row`): đọc/sửa số ở `node.row`, KHÔNG dùng `__rollup`.
 * - Lá đối tượng (`kind === 'object'`): tên hiển thị lấy từ `row.chiTietTen`/`row.chiTietMa`, không phải `node.ten`.
 */
export function buildSoDuTree(
  rows: SoDuRow[],
  chart: ChartAccount[],
): SoDuTreeNode[] {
  const nameByMa = new Map<string, string>();
  for (const a of chart) nameByMa.set(a.ma, a.ten);

  const rowsByMa = new Map<string, SoDuRow[]>();
  for (const r of rows) {
    const arr = rowsByMa.get(r.maTaiKhoan) ?? [];
    arr.push(r);
    rowsByMa.set(r.maTaiKhoan, arr);
  }

  const codeSet = new Set<string>();
  for (const code of rowsByMa.keys()) {
    codeSet.add(code);
    for (const a of chart) {
      if (a.ma !== code && code.startsWith(a.ma)) codeSet.add(a.ma);
    }
  }
  const codes = Array.from(codeSet).sort((a, b) => a.localeCompare(b));

  const parentOf = new Map<string, string | null>();
  for (const code of codes) {
    let best: string | null = null;
    for (const cand of codes) {
      if (cand !== code && code.startsWith(cand)) {
        if (best === null || cand.length > best.length) best = cand;
      }
    }
    parentOf.set(code, best);
  }
  const childrenOf = new Map<string, string[]>();
  for (const code of codes) {
    const p = parentOf.get(code) ?? null;
    if (p !== null) {
      const arr = childrenOf.get(p) ?? [];
      arr.push(code);
      childrenOf.set(p, arr);
    }
  }

  const objectLeaf = (r: SoDuRow): SoDuTreeNode => ({
    __key: r.key,
    __ma: r.maTaiKhoan,
    __isParent: false,
    __rollup: { duNo: 0, duCo: 0 },
    ten: '',
    kind: 'object',
    chiTietTheo: r.chiTietTheo,
    row: r,
  });

  const sumLeaves = (node: SoDuTreeNode): { duNo: number; duCo: number } => {
    const acc = { duNo: 0, duCo: 0 };
    const walk = (n: SoDuTreeNode) => {
      if (n.row) {
        acc.duNo += n.row.duNo || 0;
        acc.duCo += n.row.duCo || 0;
      }
      for (const c of n.children ?? []) walk(c);
    };
    for (const c of node.children ?? []) walk(c);
    return acc;
  };

  const buildAccount = (code: string): SoDuTreeNode => {
    const accRows = rowsByMa.get(code) ?? [];
    const hasChildCodes = (childrenOf.get(code) ?? []).length > 0;
    const isLeafAccount = !hasChildCodes && accRows.length > 0;
    const isDetail = isLeafAccount && accRows.some((r) => !!r.chiTietTheo);

    let children: SoDuTreeNode[] = [];
    let row: SoDuRow | undefined;
    let chiTietTheo: ChiTietLoai | undefined;

    if (isDetail) {
      children = accRows.map(objectLeaf);
      chiTietTheo = accRows.find((r) => r.chiTietTheo)?.chiTietTheo;
    } else if (isLeafAccount) {
      // TK lá không cấu hình → tối đa 1 dòng (validateRows chặn trùng mã TK không đối tượng).
      row = accRows[0];
    } else {
      children = (childrenOf.get(code) ?? [])
        .slice()
        .sort((a, b) => a.localeCompare(b))
        .map(buildAccount);
    }

    const isParent = children.length > 0;
    const node: SoDuTreeNode = {
      __key: `acc:${code}`,
      __ma: code,
      __isParent: isParent,
      __rollup: { duNo: 0, duCo: 0 },
      ten: nameByMa.get(code) ?? '',
      kind: 'account',
      chiTietTheo,
      row,
      children: isParent ? children : undefined,
    };
    node.__rollup = sumLeaves(node);
    return node;
  };

  return codes
    .filter((c) => (parentOf.get(c) ?? null) === null)
    .sort((a, b) => a.localeCompare(b))
    .map(buildAccount);
}

/** Gom `__key` của mọi node có con — dùng cho nút "Mở tất cả". */
export function collectExpandKeys(nodes: SoDuTreeNode[]): string[] {
  const keys: string[] = [];
  const walk = (ns: SoDuTreeNode[]) => {
    for (const n of ns) {
      if (n.children && n.children.length > 0) {
        keys.push(n.__key);
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return keys;
}
