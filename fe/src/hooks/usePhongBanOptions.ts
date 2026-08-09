import { useEffect, useMemo, useState } from 'react';
import { phongBanService, type PhongBan } from '@/services/phongBanService';

/**
 * Danh mục phòng ban dùng chung cho các màn nhân sự. Tách thành hook vì bốn
 * màn cùng cần: hồ sơ nhân viên (form + bảng), layout nhân viên, điều chuyển.
 *
 * Đọc lại từ API mỗi lần mount (không cache ra localStorage) — danh mục có
 * thể đổi giữa các phiên và identity-service là nguồn sự thật duy nhất.
 * Nếu API lỗi (identity chết, token bị từ chối…) thì rơi về mảng rỗng thay
 * vì để lỗi văng lên UI — các màn dùng hook này chỉ cần một combobox rỗng,
 * không cần tự xử lý lỗi riêng.
 */
export function usePhongBanOptions() {
  const [rows, setRows] = useState<PhongBan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let huy = false;
    phongBanService
      .list()
      .then((d) => {
        if (!huy) setRows(d);
      })
      .catch(() => {
        if (!huy) setRows([]);
      })
      .finally(() => {
        if (!huy) setLoading(false);
      });
    return () => {
      huy = true;
    };
  }, []);

  const options = useMemo(
    () =>
      [...rows]
        .sort(
          (a, b) =>
            (a.thuTu ?? 0) - (b.thuTu ?? 0) ||
            a.tenPhong.localeCompare(b.tenPhong, 'vi'),
        )
        .map((d) => ({ value: d.id, label: d.tenPhong })),
    [rows],
  );

  const tenTheoId = useMemo(() => {
    const m = new Map(rows.map((d) => [d.id, d.tenPhong]));
    return (id?: string | null) => (id ? (m.get(id) ?? '—') : '—');
  }, [rows]);

  return { options, tenTheoId, loading };
}
