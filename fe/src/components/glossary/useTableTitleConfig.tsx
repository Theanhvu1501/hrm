import { useCallback, useMemo, useState } from 'react';
import { Space } from 'antd';
import type { ColumnType } from 'antd/es/table';
import { useAuth } from '@/contexts/AuthContext';
import { TableTitleSettings } from '@/components/glossary/TableTitleSettings';
import ColumnChooser from '@/components/table/ColumnChooser';
import { readSavedKeys, saveVisibleKeys } from '@/components/table/columnVisibility';
import { tableTermKey, extractColTitles, lookupOverride } from '@/config/tableTitleConfig';
import type { TitleTermSpec } from '@/config/titleConfig';

/**
 * Bọc cột bảng cho mọi bảng danh sách/báo cáo:
 *  - Ẩn/hiện cột (lưu localStorage theo pageKey) — nút "Chọn cột" (icon, mọi user).
 *  - Đổi tiêu đề cột theo lĩnh vực/công ty — nút "Đổi tiêu đề" (icon, CHỈ superAdmin).
 * Trả về `columns` (đã lọc ẩn/hiện + đổi tên) và `settingsButton` (gộp 2 nút trên).
 *
 * LƯU Ý: mỗi BẢNG dùng 1 `pageKey` DUY NHẤT. Đừng dùng lại 1 pageKey cho 2 bảng
 * khác nhau trên cùng trang — override + lựa chọn cột lưu theo (pageKey, colKey) nên 2
 * bảng trùng pageKey sẽ chia sẻ trạng thái theo colKey trùng.
 */
export function useTableTitleConfig<T>(pageKey: string, columns: ColumnType<T>[]) {
  const { user, currentTenant, currentLinhVuc } = useAuth();
  const tenantG = currentTenant?.glossary;
  const linhVucG = currentLinhVuc?.glossary;
  const isSuperAdmin = !!user?.isSuperAdmin;

  // Cột "quản lý được" = có title chuỗi + key/dataIndex. Cột thao tác (không title/không
  // key) không vào danh sách chooser và LUÔN hiển thị.
  //
  // Ổn định theo NỘI DUNG (key + tiêu đề), không theo danh tính mảng: trang nào
  // cũng dựng `columns` mới mỗi lần render, nên memo theo `[columns]` làm mọi thứ
  // phía sau — kể cả `settingsButton` — thành phần tử mới mỗi lần. Trang đẩy nút
  // đó lên cha bằng setState trong useEffect (Vai trò, Quy chuẩn) sẽ lặp vô hạn:
  // cha set state → bảng render lại → nút mới → effect chạy lại ("Maximum update
  // depth exceeded").
  const colTitlesMoi = extractColTitles(columns);
  const chuKyCot = colTitlesMoi.map((c) => `${c.colKey}\u0000${c.def}`).join('\u0001');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colTitles = useMemo(() => colTitlesMoi, [chuKyCot]);
  const eligibleKeys = useMemo(() => colTitles.map((c) => c.colKey), [colTitles]);

  const terms: TitleTermSpec[] = useMemo(
    () => colTitles.map((c) => ({ tk: tableTermKey(pageKey, c.colKey) })),
    [colTitles, pageKey],
  );
  const defaults: Record<string, string> = useMemo(() => {
    const d: Record<string, string> = {};
    for (const c of colTitles) d[`${tableTermKey(pageKey, c.colKey)}|`] = c.def;
    return d;
  }, [colTitles, pageKey]);

  // --- Ẩn/hiện cột ---
  // `savedKeys === null` nghĩa là CHƯA chọn → hiện tất cả (kể cả cột mới/cột tải động).
  const [savedKeys, setSavedKeys] = useState<string[] | null>(() => readSavedKeys(pageKey));
  const showAll = savedKeys === null;
  const visibleSet = useMemo(() => new Set(savedKeys ?? eligibleKeys), [savedKeys, eligibleKeys]);
  const visibleKeys = useMemo(
    () => (showAll ? eligibleKeys : eligibleKeys.filter((k) => visibleSet.has(k))),
    [showAll, eligibleKeys, visibleSet],
  );
  const onVisibleChange = useCallback(
    (keys: string[]) => {
      setSavedKeys(keys);
      saveVisibleKeys(pageKey, keys);
    },
    [pageKey],
  );

  // --- Đổi tên + lọc cột ---
  const mappedColumns = useMemo(() => {
    const out: ColumnType<T>[] = [];
    for (const col of columns) {
      const rawKey =
        (col as { key?: unknown; dataIndex?: unknown }).key ??
        (col as { dataIndex?: unknown }).dataIndex;
      const hasTitle = typeof col.title === 'string' && col.title.trim() !== '';
      const colKey = rawKey == null ? undefined : String(rawKey);
      const manageable = hasTitle && colKey != null;

      // Cột quản lý được mà đang tắt → bỏ (showAll thì giữ hết).
      if (manageable && !showAll && !visibleSet.has(colKey as string)) continue;

      // Đổi tên nếu có override.
      if (manageable) {
        const ov = lookupOverride(tenantG, linhVucG, tableTermKey(pageKey, colKey as string));
        out.push(ov ? { ...col, title: ov } : col);
      } else {
        out.push(col);
      }
    }
    return out;
  }, [columns, tenantG, linhVucG, pageKey, visibleSet, showAll]);

  // Nhãn item trong chooser = tiêu đề sau khi áp override (khớp cái user thấy).
  const chooserItems = useMemo(
    () =>
      colTitles.map((c) => ({
        key: c.colKey,
        title: lookupOverride(tenantG, linhVucG, tableTermKey(pageKey, c.colKey)) ?? c.def,
      })),
    [colTitles, tenantG, linhVucG, pageKey],
  );

  // Memo để nút giữ nguyên danh tính khi không có gì đổi — xem chú thích ở colTitles.
  const settingsButton = useMemo(
    () =>
      colTitles.length > 0 ? (
        <Space size={4}>
          <ColumnChooser
            items={chooserItems}
            visibleKeys={visibleKeys}
            onChange={onVisibleChange}
          />
          {isSuperAdmin && <TableTitleSettings terms={terms} defaults={defaults} />}
        </Space>
      ) : null,
    [colTitles.length, chooserItems, visibleKeys, onVisibleChange, isSuperAdmin, terms, defaults],
  );

  return { columns: mappedColumns, settingsButton };
}
