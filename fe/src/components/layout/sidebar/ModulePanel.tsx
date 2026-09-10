import React from 'react';
import { MenuFoldOutlined } from '@ant-design/icons';
import { MenuItemList } from './MenuItemList';
import { SidebarSearch } from './SidebarSearch';
import type { VisibleModule } from '@/hooks/useVisibleMenu';

interface Props {
  current: VisibleModule;
  allModules: VisibleModule[];
  activePath: string;
  activeSearch?: string;
  onSelect: (key: string) => void;
  onCollapse?: () => void;
}

/**
 * Cột 196px cạnh rail. KHÔNG liệt kê lại các phân hệ — rail đã hiện đủ ngay cạnh.
 * Chỗ trống giữa danh sách và đáy là nơi thẻ "Kỳ công" sẽ vào (hoãn — thiếu API).
 */
export const ModulePanel: React.FC<Props> = ({
  current, allModules, activePath, activeSearch, onSelect, onCollapse,
}) => (
  <div className="flex w-[196px] shrink-0 flex-col gap-[8px] border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-panel))] px-[8px] py-[10px]">
    <div className="flex items-center justify-between">
      <span className="text-[15px] font-bold leading-none">{current.module.label}</span>
      {onCollapse && (
        <button
          type="button"
          aria-label="Thu gọn menu"
          onClick={onCollapse}
          className="rounded-[6px] p-[3px] text-[hsl(var(--sidebar-foreground)/0.65)] hover:bg-[hsl(var(--sidebar-accent))]"
        >
          <MenuFoldOutlined className="text-[12px]" />
        </button>
      )}
    </div>

    <SidebarSearch modules={allModules} onSelect={onSelect} />

    <MenuItemList
      leaves={current.leaves}
      activePath={activePath}
      activeSearch={activeSearch}
      onSelect={onSelect}
    />

    {/* Thẻ "Kỳ công" sẽ nằm ở đây khi có API — docs/design §3 */}
    <div className="flex-1" />
  </div>
);

export default ModulePanel;
