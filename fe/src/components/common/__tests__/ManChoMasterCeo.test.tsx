// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ManChoMasterCeo } from '../ManChoMasterCeo';

describe('ManChoMasterCeo', () => {
  it('hiện dấu M MasterCeo, có chữ thay thế cho người đọc màn hình', () => {
    render(<ManChoMasterCeo />);
    const anh = screen.getByAltText('MasterCeo') as HTMLImageElement;
    expect(anh.getAttribute('src')).toBe('/masterceo-mark.png');
  });

  it('báo cho công nghệ trợ giúp biết đang tải', () => {
    render(<ManChoMasterCeo />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('chỗ gọi đặt được lời riêng, mặc định là "Đang tải…"', () => {
    const { unmount } = render(<ManChoMasterCeo />);
    expect(screen.getByText('Đang tải…')).toBeTruthy();
    unmount();
    render(<ManChoMasterCeo chu="Đang kiểm tra đăng nhập…" />);
    expect(screen.getByText('Đang kiểm tra đăng nhập…')).toBeTruthy();
  });

  it('dùng lại dải 2px của BangDuLieu, không vẽ vòng quay riêng', () => {
    const { container } = render(<ManChoMasterCeo />);
    expect(container.querySelector('.mc-cho-dai')).toBeTruthy();
    expect(container.querySelector('.ant-spin')).toBeNull();
  });
});
