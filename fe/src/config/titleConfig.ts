import type { Glossary } from '@/types/tenant';

export interface TitleTermSpec {
  tk: string;
  surface?: string;
}

export const titleKey = (t: TitleTermSpec): string => `${t.tk}|${t.surface ?? ''}`;

/**
 * Gom các override title của 1 bảng vào glossary mới (deep-copy `base`).
 * - value rỗng hoặc bằng default → GỠ override (xóa surface / xóa label; xóa entry nếu rỗng).
 * - term có surface → chỉ ghi `surfaces[surface]` (KHÔNG set label → tránh che cột anh em).
 * - term không surface → ghi `label`.
 */
export function buildTitleGlossary(
  base: Glossary | undefined,
  terms: TitleTermSpec[],
  values: Record<string, string>,
  defaults: Record<string, string>,
): Glossary {
  const g: Glossary = JSON.parse(JSON.stringify(base ?? {}));
  for (const term of terms) {
    const key = titleKey(term);
    const v = (values[key] ?? '').trim();
    const def = (defaults[key] ?? '').trim();
    const entry = g[term.tk] ?? {};
    const keep = v !== '' && v !== def;

    if (term.surface) {
      const surfaces = { ...(entry.surfaces ?? {}) };
      if (keep) surfaces[term.surface] = v;
      else delete surfaces[term.surface];
      if (Object.keys(surfaces).length > 0) entry.surfaces = surfaces;
      else delete entry.surfaces;
    } else {
      if (keep) entry.label = v;
      else delete entry.label;
    }

    if (entry.label === undefined && (!entry.surfaces || Object.keys(entry.surfaces).length === 0)) {
      delete g[term.tk];
    } else {
      g[term.tk] = entry;
    }
  }
  return g;
}
