import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import type { MenuLeaf } from '@/config/menuCatalog';
import type { VisibleModule } from '@/hooks/useVisibleMenu';

export interface KetQuaTim {
  leaf: MenuLeaf;
  moduleLabel: string;
}

// Bỏ dấu tiếng Việt. Dùng escape [\u0300-\u036f] thay ký tự tổ hợp thật để tránh công cụ chuẩn hoá xoá mất chúng im lặng.
const boDau = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();

/** Tìm xuyên mọi mục đang hiện. Tối đa 8 kết quả cho vừa panel. */
export function timMuc(modules: VisibleModule[], tuKhoa: string): KetQuaTim[] {
  const q = boDau(tuKhoa.trim());
  if (!q) return [];
  const ra: KetQuaTim[] = [];
  for (const { module, leaves } of modules) {
    for (const leaf of leaves) {
      if (boDau(leaf.label).includes(q) || boDau(module.label).includes(q)) {
        ra.push({ leaf, moduleLabel: module.label });
        if (ra.length === 8) return ra;
      }
    }
  }
  return ra;
}

/**
 * Cờ "hãy lấy con trỏ", tăng dần, phát ra từ Sidebar mỗi lần bấm ⌘K. Sidebar
 * là nơi duy nhất luôn được mount nên phải là nơi bắt phím (panel/ô tìm này
 * có thể đang ẩn lúc bấm) — Context thay cho việc truyền prop xuyên qua
 * ModulePanel, vì ModulePanel chỉ chuyển tiếp đúng modules/onSelect và không
 * nằm trong phạm vi sửa của việc này.
 */
export const TimNhanhFocusContext = createContext(0);

interface Props {
  modules: VisibleModule[];
  onSelect: (key: string) => void;
  /** Đổi giá trị (vd. tăng dần) để tự lấy con trỏ vào ô tìm — dùng khi có
   *  Provider bọc ngoài (Sidebar); truyền tay được nếu dựng SidebarSearch
   *  độc lập không qua Context. */
  focusTick?: number;
}

export const SidebarSearch: React.FC<Props> = ({ modules, onSelect, focusTick }) => {
  const [tuKhoa, datTuKhoa] = useState('');
  const oRef = useRef<HTMLInputElement>(null);
  const ketQua = timMuc(modules, tuKhoa);
  const focusTickContext = useContext(TimNhanhFocusContext);
  const tick = focusTick ?? focusTickContext;

  // Không tự bắt ⌘K ở đây nữa — Sidebar bắt (luôn mount), rồi báo qua `tick`.
  // Hai chỗ cùng nghe một phím sẽ đá nhau (mở/đóng lộn xộn khi cả hai cùng
  // preventDefault).
  useEffect(() => {
    if (tick) oRef.current?.focus();
  }, [tick]);

  return (
    <div className="relative">
      <div className="flex h-[24px] items-center gap-[6px] rounded-[7px] border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-panel))] px-[7px]">
        <SearchOutlined className="text-[11px] text-[hsl(var(--sidebar-foreground)/0.65)]" />
        <input
          ref={oRef}
          value={tuKhoa}
          onChange={(e) => datTuKhoa(e.target.value)}
          placeholder="Tìm nhanh"
          aria-label="Tìm nhanh trong menu"
          className="w-full bg-transparent text-[11px] outline-none placeholder:text-[hsl(var(--sidebar-foreground)/0.65)]"
        />
        <span className="text-[9px] text-[hsl(var(--sidebar-foreground)/0.65)]">⌘K</span>
      </div>

      {ketQua.length > 0 && (
        <div className="absolute left-0 right-0 top-[28px] z-50 rounded-[9px] border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-panel))] p-[4px] shadow-lg">
          {ketQua.map(({ leaf, moduleLabel }) => (
            <button
              key={leaf.key}
              type="button"
              onClick={() => {
                onSelect(leaf.key);
                datTuKhoa('');
              }}
              className="flex w-full flex-col items-start rounded-[6px] px-[7px] py-[3px] text-left hover:bg-[hsl(var(--sidebar-accent))]"
            >
              <span className="text-[11.5px] leading-tight">{leaf.label}</span>
              <span className="text-[9px] text-[hsl(var(--sidebar-foreground)/0.65)]">{moduleLabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SidebarSearch;
