import React from 'react';
import { MenuItemList } from './MenuItemList';
import type { VisibleModule } from '@/hooks/useVisibleMenu';

interface Props {
  current: VisibleModule;
  activePath: string;
  activeSearch?: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}

/**
 * Popover nổi cạnh rail khi panel đang thu gọn.
 * Dùng ĐÚNG MenuItemList của panel — cùng danh sách, cùng caption cụm,
 * cùng cách đánh dấu mục sắp có.
 */
export const ModuleFlyout: React.FC<Props> = ({
  current, activePath, activeSearch, onSelect, onClose,
}) => (
  <div
    role="dialog"
    aria-label={current.module.label}
    onMouseLeave={onClose}
    className="absolute left-[62px] top-0 z-[120] w-[196px] rounded-r-[9px] border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-panel))] px-[8px] py-[10px] shadow-lg"
  >
    <div className="mb-[6px] text-[15px] font-bold leading-none">
      {current.module.label}
    </div>
    <MenuItemList
      leaves={current.leaves}
      activePath={activePath}
      activeSearch={activeSearch}
      onSelect={(key) => {
        onSelect(key);
        onClose();
      }}
    />
  </div>
);

export default ModuleFlyout;
