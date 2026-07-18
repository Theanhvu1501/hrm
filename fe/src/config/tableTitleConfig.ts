import type { Glossary } from '@/types/tenant';

export const tableTermKey = (pageKey: string, colKey: string): string =>
  `tbl:${pageKey}:${colKey}`;

export interface ColTitle {
  colKey: string;
  def: string;
}

interface ColLike {
  title?: unknown;
  key?: unknown;
  dataIndex?: unknown;
}

/** Các cột có title là chuỗi không rỗng + có key/dataIndex → đổi-tên-được. */
export function extractColTitles(columns: readonly unknown[]): ColTitle[] {
  const out: ColTitle[] = [];
  for (const c of columns as ColLike[]) {
    if (typeof c?.title !== 'string' || c.title.trim() === '') continue;
    const key = c.key ?? c.dataIndex;
    if (key == null) continue;
    out.push({ colKey: String(key), def: c.title });
  }
  return out;
}

/** Tra override hiện tại (tenant thắng nganh). */
export function lookupOverride(
  tenantG: Glossary | undefined,
  nganhG: Glossary | undefined,
  tk: string,
  surface?: string,
): string | undefined {
  for (const g of [tenantG, nganhG]) {
    const e = g?.[tk];
    if (!e) continue;
    if (surface && e.surfaces?.[surface]) return e.surfaces[surface];
    if (!surface && e.label) return e.label;
  }
  return undefined;
}
