import React from 'react';
import { pathOf, type MenuLeaf } from '@/config/menuCatalog';

interface Props {
  leaves: MenuLeaf[];
  /** location.pathname hiện tại. */
  activePath: string;
  /** location.search hiện tại (kèm dấu '?'). BẮT BUỘC truyền ở nơi có
   *  Router — thiếu nó thì 4 mục "Kế hoạch …" ở 4 phân hệ khác nhau cùng
   *  sáng, vì chúng chỉ khác nhau ở `?tab=`. */
  activeSearch?: string;
  onSelect: (key: string) => void;
}

/**
 * Mục có query trong `key` phải khớp CẢ query mới coi là trang hiện tại;
 * mục không có query so như cũ (chỉ pathname).
 * So theo từng tham số đã khai chứ không so nguyên chuỗi: URL thật có thể
 * mang thêm tham số khác (phân trang, bộ lọc) mà mục vẫn phải sáng.
 */
export const khopQuery = (leafKey: string, activeSearch = ''): boolean => {
  const q = leafKey.split('?')[1];
  if (!q) return true;
  const dangCo = new URLSearchParams(activeSearch);
  return [...new URLSearchParams(q)].every(([k, v]) => dangCo.get(k) === v);
};

/**
 * Danh sách mục con của một phân hệ.
 * DÙNG CHUNG cho panel · flyout · drawer mobile — ba chỗ đó không được
 * tự vẽ lại danh sách, nếu không sẽ lệch nhau khi menu đổi.
 */
export const MenuItemList: React.FC<Props> = ({
  leaves, activePath, activeSearch, onSelect,
}) => {
  let clusterDangVe: string | undefined;

  return (
    <div className="flex flex-col">
      {leaves.map((leaf) => {
        const moCluster = !!leaf.cluster && leaf.cluster !== clusterDangVe;
        // Tracker phải là cụm của mục ngay trước, không phải cụm không rỗng gần nhất.
        // Nếu không, khối cụm lặp lại (cụm A → mục không cụm → cụm A) sẽ mất tiêu đề lần 2.
        clusterDangVe = leaf.cluster;
        const dangMo = pathOf(leaf) === activePath && khopQuery(leaf.key, activeSearch);
        const soon = leaf.status === 'soon';

        return (
          <React.Fragment key={leaf.key}>
            {moCluster && (
              <div className="px-[7px] pb-[3px] pt-[10px] text-[8.5px] font-bold tracking-[0.6px] text-[hsl(var(--sidebar-foreground)/0.65)]">
                {leaf.cluster}
              </div>
            )}
            <button
              type="button"
              aria-current={dangMo ? 'page' : undefined}
              onClick={() => onSelect(leaf.key)}
              className={[
                'flex h-[19px] w-full items-center gap-[6px] rounded-[6px] px-[7px] py-[3.5px]',
                'text-left text-[11.5px] leading-none transition-colors',
                dangMo
                  ? 'bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] font-medium'
                  : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]',
                soon ? 'menu-item-coming-soon' : '',
              ].join(' ')}
            >
              {leaf.icon && <span className="shrink-0 text-[12px]">{leaf.icon}</span>}
              <span className="min-w-0 flex-1 truncate">{leaf.label}</span>
              {soon && <span className="coming-soon-dot" />}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};
