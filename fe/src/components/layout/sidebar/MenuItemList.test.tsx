// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MenuItemList, khopQuery } from './MenuItemList';
import type { MenuLeaf } from '@/config/menuCatalog';

const leaves: MenuLeaf[] = [
  { key: '/kho/nhap-kho', label: 'Nhập kho', module: 'nhan-su', status: 'ok' },
  { key: '/kho/tinh-gia-xuat', label: 'Tính giá xuất kho', module: 'nhan-su', status: 'soon' },
  { key: '/trung-tam-du-lieu/hang-hoa', label: 'Hàng hóa', module: 'nhan-su', cluster: 'NHÓM HÀNG', status: 'ok' },
];

describe('MenuItemList', () => {
  it('vẽ đủ mục, kể cả mục chưa có trang', () => {
    render(<MenuItemList leaves={leaves} activePath="/kho/nhap-kho" onSelect={() => {}} />);
    expect(screen.getByText('Nhập kho')).toBeTruthy();
    expect(screen.getByText('Tính giá xuất kho')).toBeTruthy();
  });

  it('mục soon có chấm cam và class làm mờ', () => {
    const { container } = render(
      <MenuItemList leaves={leaves} activePath="/kho/nhap-kho" onSelect={() => {}} />,
    );
    const nut = screen.getByText('Tính giá xuất kho').closest('button')!;
    expect(nut.className).toContain('menu-item-coming-soon');
    expect(container.querySelectorAll('.coming-soon-dot')).toHaveLength(1);
  });

  it('hiện caption cụm một lần, ngay trước mục đầu của cụm', () => {
    render(<MenuItemList leaves={leaves} activePath="/kho/nhap-kho" onSelect={() => {}} />);
    expect(screen.getAllByText('NHÓM HÀNG')).toHaveLength(1);
  });

  it('đánh dấu mục đang mở bằng aria-current', () => {
    render(<MenuItemList leaves={leaves} activePath="/kho/nhap-kho" onSelect={() => {}} />);
    const nut = screen.getByText('Nhập kho').closest('button')!;
    expect(nut.getAttribute('aria-current')).toBe('page');
  });

  it('bấm mục thì gọi onSelect với key đầy đủ, giữ nguyên query string', () => {
    const onSelect = vi.fn();
    const ds: MenuLeaf[] = [
      { key: '/trung-tam-du-lieu/ke-hoach?tab=ban-hang', permKey: '/trung-tam-du-lieu/ke-hoach', label: 'Kế hoạch bán hàng', module: 'luong', status: 'ok' },
    ];
    render(<MenuItemList leaves={ds} activePath="/" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Kế hoạch bán hàng'));
    expect(onSelect).toHaveBeenCalledWith('/trung-tam-du-lieu/ke-hoach?tab=ban-hang');
  });

  it('danh sách xen kẽ: cụm A → mục không cụm → cụm A phải vẽ tiêu đề A hai lần', () => {
    const ds: MenuLeaf[] = [
      { key: '/a1', label: 'A1', module: 'nhan-su', cluster: 'A', status: 'ok' },
      { key: '/b', label: 'B không cụm', module: 'nhan-su', status: 'ok' },
      { key: '/a2', label: 'A2', module: 'nhan-su', cluster: 'A', status: 'ok' },
    ];
    render(<MenuItemList leaves={ds} activePath="/" onSelect={() => {}} />);
    expect(screen.getAllByText('A')).toHaveLength(2);
  });

  /**
   * Bốn phân hệ cùng trỏ '/trung-tam-du-lieu/ke-hoach', chỉ khác `?tab=`.
   * So mỗi pathname thì cả bốn cùng nhận là trang hiện tại.
   */
  it('hai mục cùng path khác ?tab= — chỉ mục khớp cả query mới được đánh dấu', () => {
    const ds: MenuLeaf[] = [
      { key: '/trung-tam-du-lieu/ke-hoach?tab=ban-hang', permKey: '/trung-tam-du-lieu/ke-hoach', label: 'Kế hoạch bán hàng', module: 'luong', status: 'ok' },
      { key: '/trung-tam-du-lieu/ke-hoach?tab=dong-tien', permKey: '/trung-tam-du-lieu/ke-hoach', label: 'Kế hoạch ngân sách', module: 'cham-cong', status: 'ok' },
    ];
    render(
      <MenuItemList
        leaves={ds}
        activePath="/trung-tam-du-lieu/ke-hoach"
        activeSearch="?tab=ban-hang"
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('Kế hoạch bán hàng').closest('button')!.getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('Kế hoạch ngân sách').closest('button')!.getAttribute('aria-current')).toBeNull();
  });

  it('khopQuery: mục không query so như cũ, mục có query bỏ qua tham số thừa của URL', () => {
    expect(khopQuery('/so-quy', '?tab=abc')).toBe(true);
    expect(khopQuery('/x?tab=a', '?tab=a&page=2')).toBe(true);
    expect(khopQuery('/x?tab=a', '?tab=b')).toBe(false);
    expect(khopQuery('/x?tab=a', '')).toBe(false);
  });

  it('nhãn dài phải có min-w-0 để truncate hoạt động', () => {
    const ds: MenuLeaf[] = [
      { key: '/long', label: 'Nhãn rất rất rất rất rất dài vượt quá bề rộng nút', module: 'nhan-su', status: 'ok' },
    ];
    render(<MenuItemList leaves={ds} activePath="/" onSelect={() => {}} />);
    const labelSpan = screen.getByText(/Nhãn rất rất/);
    expect(labelSpan.className).toContain('min-w-0');
    expect(labelSpan.className).toContain('truncate');
  });
});
