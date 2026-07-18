export type TreeNode<T> = T & {
  __ma: string;
  __isParent: boolean;
  __isDoiTuong?: boolean;
  __rollup: Record<string, number>;
  children?: TreeNode<T>[];
};

export interface ChartAccount {
  ma: string;
  ten: string;
}

/**
 * Dựng cây tài khoản đa cấp theo prefix mã.
 *
 * @param reportRows  Dòng báo cáo (mỗi dòng ứng 1 mã TK)
 * @param allAccounts Danh mục TK đầy đủ (để biết TK cha trung gian)
 * @param getCode     Lấy mã TK từ 1 report row
 * @param sumFields   Các field số để roll-up tổng con cháu
 * @param makeSynthetic Tạo row cho node cha không có dữ liệu báo cáo (đặt tên, field số = 0)
 */
export function buildAccountTree<T>(
  reportRows: T[],
  allAccounts: ChartAccount[],
  getCode: (row: T) => string,
  sumFields: (keyof T & string)[],
  makeSynthetic: (account: ChartAccount) => T,
): TreeNode<T>[] {
  const reportByCode = new Map<string, T>();
  for (const r of reportRows) reportByCode.set(getCode(r), r);

  const accountByCode = new Map<string, ChartAccount>();
  for (const a of allAccounts) accountByCode.set(a.ma, a);

  // Tập mã = chart ∪ report
  const codeSet = new Set<string>();
  for (const a of allAccounts) codeSet.add(a.ma);
  for (const c of reportByCode.keys()) codeSet.add(c);
  const codes = Array.from(codeSet).sort((a, b) => a.localeCompare(b));

  // Cha = mã là tiền tố đúng dài nhất
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

  // Giữ node nếu chính nó hoặc con cháu có dữ liệu báo cáo
  const keepCache = new Map<string, boolean>();
  const shouldKeep = (code: string): boolean => {
    const cached = keepCache.get(code);
    if (cached !== undefined) return cached;
    let keep = reportByCode.has(code);
    for (const k of childrenOf.get(code) ?? []) {
      if (shouldKeep(k)) keep = true;
    }
    keepCache.set(code, keep);
    return keep;
  };

  const buildNode = (code: string): TreeNode<T> => {
    const keptKids = (childrenOf.get(code) ?? [])
      .filter(shouldKeep)
      .sort((a, b) => a.localeCompare(b));
    const childNodes = keptKids.map(buildNode);

    const ownRow = reportByCode.get(code);
    const base: T = ownRow
      ? { ...ownRow }
      : makeSynthetic(accountByCode.get(code) ?? { ma: code, ten: '' });

    // Roll-up = tổng field số của TẤT CẢ con cháu có dữ liệu (không gồm chính node)
    const rollup: Record<string, number> = {};
    for (const f of sumFields) rollup[f] = 0;
    const addDesc = (c: string) => {
      const row = reportByCode.get(c);
      if (row) {
        for (const f of sumFields) {
          rollup[f] += Number((row as Record<string, unknown>)[f]) || 0;
        }
      }
      for (const k of childrenOf.get(c) ?? []) addDesc(k);
    };
    for (const k of keptKids) addDesc(k);

    return {
      ...(base as object),
      __ma: code,
      __isParent: childNodes.length > 0,
      __rollup: rollup,
      ...(childNodes.length > 0 ? { children: childNodes } : {}),
    } as TreeNode<T>;
  };

  // Gốc = node được giữ mà không có cha được giữ
  return codes
    .filter((c) => {
      if (!shouldKeep(c)) return false;
      const p = parentOf.get(c) ?? null;
      return p === null || !shouldKeep(p);
    })
    .map(buildNode);
}

/** Gom mã (__ma) của tất cả node có con — dùng cho nút "Mở tất cả". */
export function collectParentKeys<T>(nodes: TreeNode<T>[]): string[] {
  const keys: string[] = [];
  const walk = (ns: TreeNode<T>[]) => {
    for (const n of ns) {
      if (n.children && n.children.length > 0) {
        keys.push(n.__ma);
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return keys;
}

/**
 * Gắn các node đối tượng (đã dựng sẵn) làm con của node tài khoản tương ứng.
 * Đối tượng là PHÂN RÃ của số dư TK (không nằm trong __rollup) → chỉ append làm
 * con và đánh dấu node TK là cha. Mutate cây tại chỗ.
 */
export function attachDoiTuongChildren<T>(
  tree: TreeNode<T>[],
  childrenByCode: Map<string, TreeNode<T>[]>,
): void {
  const walk = (nodes: TreeNode<T>[]) => {
    for (const node of nodes) {
      if (node.__isDoiTuong) continue;
      if (node.children && node.children.length > 0) walk(node.children);
      const kids = childrenByCode.get(node.__ma);
      if (kids && kids.length > 0) {
        node.children = [...(node.children ?? []), ...kids];
        node.__isParent = true;
      }
    }
  };
  walk(tree);
}
