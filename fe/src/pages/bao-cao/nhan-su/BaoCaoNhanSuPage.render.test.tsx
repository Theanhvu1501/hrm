// @vitest-environment jsdom
/**
 * Màn `/bao-cao/nhan-su` phải render được — FE không có ErrorBoundary, một
 * throw lúc render là trắng TOÀN trang chứ không riêng màn này.
 */
import React from 'react';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import BaoCaoNhanSuPage from './BaoCaoNhanSuPage';
import { chuaCoNguon } from './baoCao.types';
import { layBaoCao, KY_MAC_DINH } from './duLieuMau';

beforeAll(() => {
  // antd đọc matchMedia lúc mount (responsive Grid), jsdom không có sẵn.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
  // ResponsiveContainer của recharts đo bằng ResizeObserver; jsdom không có.
  window.ResizeObserver =
    window.ResizeObserver ??
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
});

describe('BaoCaoNhanSuPage', () => {
  it('render được và hiện đủ 4 tiêu đề nhóm', () => {
    render(<BaoCaoNhanSuPage />);
    expect(screen.getByText('Báo cáo nhân sự')).toBeTruthy();
    for (const nhom of layBaoCao(KY_MAC_DINH).nhom) {
      expect(screen.getByText(`${nhom.soThuTu}. ${nhom.ten}`)).toBeTruthy();
    }
  });

  it('nói rõ đây là số liệu mẫu, không để khách tưởng là dữ liệu thật', () => {
    render(<BaoCaoNhanSuPage />);
    expect(screen.getByText('Số liệu mẫu')).toBeTruthy();
  });

  it('hiện đúng số ô "Chưa có dữ liệu" bằng số chỉ số chưa có nguồn', () => {
    render(<BaoCaoNhanSuPage />);
    const baoCao = layBaoCao(KY_MAC_DINH);
    expect(screen.getAllByText('Chưa có dữ liệu')).toHaveLength(baoCao.soChiSoChuaCoNguon);
  });

  it('mỗi ô chưa có dữ liệu đều nói cần gì mới có số', () => {
    render(<BaoCaoNhanSuPage />);
    const nguonThieu = layBaoCao(KY_MAC_DINH)
      .nhom.flatMap((n) => n.chiSo)
      .map((c) => c.nguon)
      .filter(chuaCoNguon);
    for (const nguon of nguonThieu) {
      expect(screen.getByText(`Cần: ${nguon.canGi}`)).toBeTruthy();
    }
  });
});
