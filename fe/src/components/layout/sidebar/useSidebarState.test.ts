// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  moduleTheoPath,
  useSidebarState,
  laManHinhNhapLieu,
  KHOA_THU_GON,
} from './useSidebarState';

describe('moduleTheoPath', () => {
  it('tìm ra phân hệ của một trang', () => {
    expect(moduleTheoPath('/nhan-su/ho-so-nhan-vien')).toBe('nhan-su');
    expect(moduleTheoPath('/cham-cong/bang-cong')).toBe('cham-cong');
    expect(moduleTheoPath('/luong/quyet-toan-tncn')).toBe('luong');
    expect(moduleTheoPath('/bao-cao/nhan-su')).toBe('bao-cao');
    expect(moduleTheoPath('/')).toBe('tong-quan');
  });

  it('trang con không khai trong menu thì quy về phân hệ của trang cha', () => {
    expect(moduleTheoPath('/nhan-su/ho-so-nhan-vien/tao-moi')).toBe('nhan-su');
  });

  it('đường dẫn ngoài menu trả undefined', () => {
    expect(moduleTheoPath('/khong-ton-tai')).toBeUndefined();
    expect(moduleTheoPath('/cau-hinh/vai-tro')).toBeUndefined();
  });
});

describe('laManHinhNhapLieu', () => {
  it('nhận diện màn tạo mới và sửa', () => {
    expect(laManHinhNhapLieu('/kho/nhap-kho/tao-moi')).toBe(true);
    expect(laManHinhNhapLieu('/kho/nhap-kho/abc123/sua')).toBe(true);
  });

  it('màn danh sách/xem thường không tính', () => {
    expect(laManHinhNhapLieu('/kho/nhap-kho')).toBe(false);
    expect(laManHinhNhapLieu('/')).toBe(false);
  });
});

describe('useSidebarState', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('mặc định mở panel', () => {
    const { result } = renderHook(() => useSidebarState('u1'));
    expect(result.current.thuGon).toBe(false);
  });

  it('nhớ trạng thái thu gọn theo từng người dùng', () => {
    const { result } = renderHook(() => useSidebarState('u1'));
    act(() => result.current.datThuGon(true));
    expect(localStorage.getItem(KHOA_THU_GON('u1'))).toBe('true');

    const khac = renderHook(() => useSidebarState('u2'));
    expect(khac.result.current.thuGon).toBe(false);
  });

  it('vào thẳng một màn nhập liệu thì khởi tạo ở trạng thái thu gọn', () => {
    window.history.pushState({}, '', '/kho/nhap-kho/tao-moi');
    const { result } = renderHook(() => useSidebarState('u1'));
    expect(result.current.thuGon).toBe(true);
  });

  it('điều hướng SANG màn nhập liệu thì tự thu gọn', () => {
    const { result, rerender } = renderHook(
      ({ pathname }) => useSidebarState('u1', pathname),
      { initialProps: { pathname: '/kho/nhap-kho' } },
    );
    expect(result.current.thuGon).toBe(false);

    rerender({ pathname: '/kho/nhap-kho/tao-moi' });
    expect(result.current.thuGon).toBe(true);
  });
});
