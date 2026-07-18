import { useMemo, useState } from 'react';
import type { ColumnType } from 'antd/es/table';
import ColumnChooser from './ColumnChooser';
import { readSavedKeys, saveVisibleKeys } from './columnVisibility';

const colKeyOf = <T,>(col: ColumnType<T>): string | undefined => {
  const raw =
    (col as { key?: unknown; dataIndex?: unknown }).key ??
    (col as { dataIndex?: unknown }).dataIndex;
  return raw == null ? undefined : String(raw);
};

/**
 * Ẩn/hiện cột cho bảng KHÔNG đi qua `useTableTitleConfig` (vd tiêu đề cột là node React
 * thay vì chuỗi). Caller cấp `labelOf(col)` để lấy nhãn hiển thị trong chooser; trả `null`
 * nghĩa là cột không quản-lý-được (luôn hiển thị, vd cột thao tác).
 *
 * Lưu lựa chọn vào localStorage theo `pageKey` (`tblcols:{pageKey}`); chưa chọn → hiện tất cả.
 */
export function useColumnVisibility<T>(
  pageKey: string,
  columns: ColumnType<T>[],
  labelOf: (col: ColumnType<T>) => string | null,
  opts?: { onChange?: (keys: string[]) => void },
) {
  // Cột quản-lý-được = có key + có nhãn.
  const manageable = useMemo(() => {
    const out: { key: string; title: string }[] = [];
    for (const col of columns) {
      const key = colKeyOf(col);
      const label = labelOf(col);
      if (key != null && label != null && label.trim() !== '') {
        out.push({ key, title: label });
      }
    }
    return out;
  }, [columns, labelOf]);

  const eligibleKeys = useMemo(() => manageable.map((m) => m.key), [manageable]);

  const [savedKeys, setSavedKeys] = useState<string[] | null>(() => readSavedKeys(pageKey));
  const showAll = savedKeys === null;
  const visibleSet = useMemo(() => new Set(savedKeys ?? eligibleKeys), [savedKeys, eligibleKeys]);
  const visibleKeys = useMemo(
    () => (showAll ? eligibleKeys : eligibleKeys.filter((k) => visibleSet.has(k))),
    [showAll, eligibleKeys, visibleSet],
  );
  const onVisibleChange = (keys: string[]) => {
    setSavedKeys(keys);
    saveVisibleKeys(pageKey, keys);
    opts?.onChange?.(keys);
  };

  const filteredColumns = useMemo(() => {
    if (showAll) return columns;
    const manageableSet = new Set(eligibleKeys);
    return columns.filter((col) => {
      const key = colKeyOf(col);
      if (key == null || !manageableSet.has(key)) return true; // không quản-lý-được → giữ
      return visibleSet.has(key);
    });
  }, [columns, showAll, visibleSet, eligibleKeys]);

  const chooserButton =
    manageable.length > 0 ? (
      <ColumnChooser items={manageable} visibleKeys={visibleKeys} onChange={onVisibleChange} />
    ) : null;

  return { columns: filteredColumns, chooserButton };
}
