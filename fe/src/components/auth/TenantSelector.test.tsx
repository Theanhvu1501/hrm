// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const auth = {
  availableTenants: [] as { tenantId: string; tenantName: string; tenantSlug: string; role: string }[],
  selectTenant: vi.fn(async () => {}),
  logout: vi.fn(),
  isLoading: false,
};
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

import { TenantSelector } from './TenantSelector';

const tenant = (id: string, name: string) => ({ tenantId: id, tenantName: name, tenantSlug: id, role: 'member' });

const renderSelector = () =>
  render(
    <MemoryRouter>
      <TenantSelector />
    </MemoryRouter>
  );

describe('TenantSelector', () => {
  beforeEach(() => {
    localStorage.clear();
    auth.selectTenant.mockClear();
    auth.logout.mockClear();
    auth.isLoading = false;
  });

  it('chỉ 1 công ty → chọn luôn, không hiện bước chọn', async () => {
    auth.availableTenants = [tenant('t1', 'Công ty A')];
    renderSelector();
    await waitFor(() => expect(auth.selectTenant).toHaveBeenCalledWith('t1'));
    expect(screen.queryByText('Công ty của bạn')).toBeNull();
  });

  it('nhiều công ty → chọn rồi bấm Đồng ý mới vào', async () => {
    auth.availableTenants = [tenant('t1', 'Công ty A'), tenant('t2', 'Công ty B')];
    renderSelector();
    expect(auth.selectTenant).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Công ty B'));
    fireEvent.click(screen.getByRole('button', { name: /đồng ý/i }));
    await waitFor(() => expect(auth.selectTenant).toHaveBeenCalledWith('t2'));
  });

  it('công ty chọn gần nhất nằm ở mục "Công ty đang làm việc" và được chọn sẵn', async () => {
    localStorage.setItem('app.lastTenantId', 't2');
    auth.availableTenants = [tenant('t1', 'Công ty A'), tenant('t2', 'Công ty B')];
    renderSelector();
    expect(screen.getByText('Công ty đang làm việc')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /đồng ý/i }));
    await waitFor(() => expect(auth.selectTenant).toHaveBeenCalledWith('t2'));
  });

  it('tìm kiếm lọc theo tên công ty', () => {
    auth.availableTenants = [tenant('t1', 'Công ty A'), tenant('t2', 'Công ty B')];
    renderSelector();
    fireEvent.change(screen.getByPlaceholderText('Tìm kiếm'), { target: { value: 'ty B' } });
    expect(screen.queryByText('Công ty A')).toBeNull();
    expect(screen.getByText('Công ty B')).toBeTruthy();
  });

  it('Hủy bỏ → đăng xuất', () => {
    auth.availableTenants = [tenant('t1', 'Công ty A'), tenant('t2', 'Công ty B')];
    renderSelector();
    fireEvent.click(screen.getByRole('button', { name: /hủy bỏ/i }));
    expect(auth.logout).toHaveBeenCalled();
  });
});
