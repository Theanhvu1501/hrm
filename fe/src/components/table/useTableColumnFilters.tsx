import React, { useCallback, useMemo, useState } from 'react';
import { CaretDownOutlined } from '@ant-design/icons';
import type { ColumnType } from 'antd/es/table';
import ColumnFilterDropdown from './ColumnFilterDropdown';
import {
  hasActiveFilters,
  isActiveFilter,
  matchAllFilters,
  type CellValue,
  type ColumnFilter,
  type ColumnFilters,
  type FilterKind,
} from './columnFilter';
import { readPinnedKeys, savePinnedKeys, togglePinned } from './columnPin';

/**
 * Lọc + cố định cột ngay tại header (antd `filterDropdown`).
 *
 * CHỦ Ý không dùng `onFilter` của antd: nó lọc trên từng dòng đã dàn phẳng, nên bảng có dòng
 * nhóm/dòng tổng sẽ không tính lại được số tổng. Hook chỉ giữ state + vẽ popover; việc lọc dữ
 * liệu do trang tự làm trên dữ liệu gốc (dùng `matches`).
 *
 * Bộ lọc sống theo vòng đời trang (rời trang là mất). Cột ghim lưu localStorage theo
 * `pageKey` + công ty đang chọn.
 */
export interface FilterableOptions {
  /** 'number' → popover dùng toán tử số. Mặc định 'text'. */
  type?: FilterKind;
  /** Nhãn "Lọc …" khi tiêu đề cột trùng nhau (vd 4 cột "Nợ"/"Có"). Mặc định lấy `col.title`. */
  filterTitle?: string;
}

export function useTableColumnFilters(pageKey: string) {
  const [filters, setFilters] = useState<ColumnFilters>({});
  const [pinned, setPinned] = useState<string[]>(() => readPinnedKeys(pageKey));

  const setFilter = useCallback((key: string, filter: ColumnFilter | undefined) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (filter) next[key] = filter;
      else delete next[key];
      return next;
    });
  }, []);

  const togglePin = useCallback(
    (key: string) => {
      setPinned((prev) => {
        const next = togglePinned(prev, key);
        savePinnedKeys(pageKey, next);
        return next;
      });
    },
    [pageKey],
  );

  const pinnedSet = useMemo(() => new Set(pinned), [pinned]);

  /**
   * Gắn popover lọc + cố định vào một cột. `title` phải là chuỗi (dùng làm nhãn "Lọc ...").
   * Cột số truyền `{ type: 'number' }`; cột trùng tiêu đề truyền thêm `filterTitle`.
   */
  const filterable = useCallback(
    <T,>(
      col: ColumnType<T> & { key: string; title: string },
      opts?: FilterableOptions,
    ): ColumnType<T> => {
      const kind: FilterKind = opts?.type ?? 'text';
      const active = isActiveFilter(filters[col.key]);
      return {
        ...col,
        fixed: pinnedSet.has(col.key) ? 'left' : col.fixed,
        filterIcon: (
          <CaretDownOutlined style={{ color: active ? '#1890ff' : undefined }} />
        ),
        filtered: active,
        filterDropdown: ({ close }: { close: () => void }) => (
          <ColumnFilterDropdown
            title={opts?.filterTitle ?? col.title}
            kind={kind}
            filter={filters[col.key]}
            pinned={pinnedSet.has(col.key)}
            onApply={(f) => setFilter(col.key, f)}
            onTogglePin={() => {
              togglePin(col.key);
              close();
            }}
            onClose={close}
          />
        ),
      };
    },
    [filters, pinnedSet, setFilter, togglePin],
  );

  /** Dòng có khớp toàn bộ bộ lọc đang bật không. `getValue(row, key)` lấy ô theo key cột. */
  const matches = useCallback(
    <T,>(row: T, getValue: (row: T, key: string) => CellValue) =>
      matchAllFilters(row, filters, getValue),
    [filters],
  );

  return {
    filters,
    filtering: hasActiveFilters(filters),
    hasPinned: pinned.length > 0,
    filterable,
    matches,
  };
}
