import { useCallback, useEffect, useRef, useState } from 'react';
import { MENU_LEAVES, pathOf, type ModuleId } from '@/config/menuCatalog';

export const KHOA_THU_GON = (userId?: string) =>
  `sidebar-thu-gon:${userId ?? 'khach'}`;

/** Ghi trạng thái thu gọn. Nuốt lỗi vì chế độ ẩn danh chặn lưu trữ — mất tiện
 *  ích nhớ thì chấp nhận được, vỡ sidebar thì không. */
const luuThuGon = (userId: string | undefined, v: boolean): void => {
  try {
    localStorage.setItem(KHOA_THU_GON(userId), String(v));
  } catch {
    /* bỏ qua */
  }
};

/** MENU_LEAVES đã sắp theo độ dài path giảm dần, tính một lần lúc nạp module —
 *  danh sách là hằng số, không cần sort lại mỗi lần gọi moduleTheoPath. */
const LEAVES_THEO_DO_DAI = [...MENU_LEAVES].sort(
  (a, b) => pathOf(b).length - pathOf(a).length,
);

/** Phân hệ chứa một pathname. Khớp dài nhất trước để '/' không nuốt hết. */
export function moduleTheoPath(pathname: string): ModuleId | undefined {
  const khop = LEAVES_THEO_DO_DAI.find((l) => {
    const p = pathOf(l);
    return p === '/' ? pathname === '/' : pathname.startsWith(p);
  });
  return khop?.module;
}

/** Màn hình nhập liệu (tạo mới/sửa) — sidebar tự thu gọn để nhường chỗ form. */
export function laManHinhNhapLieu(pathname: string): boolean {
  return pathname.includes('/tao-moi') || pathname.includes('/sua');
}

/**
 * `pathname` truyền tay thay vì gọi `useLocation()` ngay trong hook — để hook
 * này vẫn dùng được ngoài Router (test hiện có gọi `renderHook` không bọc
 * Router). Sidebar (nơi duy nhất gọi hook) đã tự có `useLocation()`, truyền
 * xuống là đủ.
 */
export function useSidebarState(userId?: string, pathname?: string) {
  const [thuGon, datThuGonState] = useState<boolean>(() => {
    if (laManHinhNhapLieu(window.location.pathname)) return true;
    try {
      return localStorage.getItem(KHOA_THU_GON(userId)) === 'true';
    } catch {
      return false;
    }
  });
  const [moduleDangChon, chonModule] = useState<ModuleId | undefined>();

  const datThuGon = useCallback(
    (v: boolean) => {
      datThuGonState(v);
      luuThuGon(userId, v);
    },
    [userId],
  );

  // ⌘\ hoặc Ctrl+\ để mở/đóng panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '\\' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        datThuGonState((v) => {
          const moi = !v;
          luuThuGon(userId, moi);
          return moi;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [userId]);

  // Tự thu gọn khi ĐIỀU HƯỚNG vào màn hình nhập liệu (không phải lần render
  // đầu — trạng thái ban đầu đã xử lý ở useState phía trên). Giống hệt effect
  // cũ từng nằm ở MainLayout trước khi sidebar tự giữ trạng thái thu gọn.
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (pathname !== undefined && prevPathnameRef.current !== pathname) {
      if (laManHinhNhapLieu(pathname) && !thuGon) {
        datThuGon(true);
      }
      prevPathnameRef.current = pathname;
    }
  }, [pathname, thuGon, datThuGon]);

  return { thuGon, datThuGon, moduleDangChon, chonModule, moduleTheoUrl: moduleTheoPath };
}
