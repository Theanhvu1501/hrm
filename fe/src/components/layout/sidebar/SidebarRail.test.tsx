// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarRail } from './SidebarRail';
import type { VisibleModule } from '@/hooks/useVisibleMenu';

const modules: VisibleModule[] = [
  {
    module: { id: 'nhan-su', label: 'Công cụ dụng cụ', railLabel: 'CCDC', icon: null },
    leaves: [
      { key: '/kho/nhap-kho', label: 'Nhập kho', module: 'nhan-su', status: 'ok' },
      { key: '/kho/xuat-kho', label: 'Xuất kho', module: 'nhan-su', status: 'ok' },
    ],
  },
  {
    module: { id: 'cham-cong', label: 'Vốn & dòng tiền', railLabel: 'Dòng tiền', icon: null },
    leaves: [{ key: '/thue/tong-hop', label: 'Tổng hợp', module: 'cham-cong', status: 'ok' }],
  },
];

describe('SidebarRail', () => {
  it('vẽ một ô cho mỗi phân hệ, dùng nhãn viết tắt', () => {
    render(<SidebarRail modules={modules} activeModule="nhan-su" onPick={() => {}} />);
    expect(screen.getByText('CCDC')).toBeTruthy();
    expect(screen.getByText('Dòng tiền')).toBeTruthy();
  });

  it('tooltip ghi tên đầy đủ kèm số mục con', () => {
    render(<SidebarRail modules={modules} activeModule="nhan-su" onPick={() => {}} />);
    const o = screen.getByText('CCDC').closest('button')!;
    expect(o.getAttribute('title')).toBe('Công cụ dụng cụ — 2 mục');
  });

  it('đánh dấu phân hệ đang mở', () => {
    render(<SidebarRail modules={modules} activeModule="nhan-su" onPick={() => {}} />);
    expect(screen.getByText('CCDC').closest('button')!.getAttribute('aria-current')).toBe('true');
    expect(screen.getByText('Dòng tiền').closest('button')!.getAttribute('aria-current')).toBeNull();
  });

  it('bấm ô gọi onPick với id phân hệ', () => {
    const onPick = vi.fn();
    render(<SidebarRail modules={modules} activeModule="nhan-su" onPick={onPick} />);
    fireEvent.click(screen.getByText('Dòng tiền'));
    expect(onPick).toHaveBeenCalledWith('cham-cong');
  });

  it('nhãn hiển thị là railLabel, label đầy đủ không xuất hiện', () => {
    render(<SidebarRail modules={modules} activeModule="nhan-su" onPick={() => {}} />);
    expect(screen.getByText('CCDC')).toBeTruthy();
    expect(screen.queryByText('Công cụ dụng cụ')).toBeNull();
  });
});
