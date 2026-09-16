import { useEffect, useMemo, useState } from "react";
import {
  soDoToChucService,
  type ChucDanhChon,
} from "@/services/soDoToChucService";

/**
 * Chức danh lấy từ SƠ ĐỒ TỔ CHỨC (yêu cầu d13) — dùng ở Hồ sơ nhân viên và
 * Quá trình công tác.
 *
 * Nhãn là ĐƯỜNG DẪN đầy đủ ("Khối Kinh doanh / Phòng Bán hàng / Trưởng
 * phòng") nhưng giá trị lưu xuống vẫn là TÊN chức danh: hồ sơ đang lưu
 * `chucDanh` dạng chuỗi và hợp đồng đã in ra cũng mang chuỗi đó. Đổi sang lưu
 * id là phải di trú toàn bộ hồ sơ cũ, mà cái nhìn thấy trên hợp đồng thì
 * không đổi.
 *
 * Lỗi tải (chưa dựng sơ đồ, không có quyền) rơi về mảng rỗng — ô chọn vẫn gõ
 * tay được, không chặn ai nhập hồ sơ.
 */
export function useChucDanhOptions() {
  const [rows, setRows] = useState<ChucDanhChon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let huy = false;
    soDoToChucService
      .chucDanh()
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
      rows.map((c) => ({
        value: c.ten,
        label: c.duongDan || c.ten,
      })),
    [rows],
  );

  return { options, rows, loading };
}
