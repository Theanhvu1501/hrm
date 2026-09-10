// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ColumnsType } from 'antd/es/table';
import { BangDuLieu } from '../BangDuLieu';

// antd 6 gọi matchMedia lúc dựng, và dùng ResizeObserver để đo cột khi bảng có
// `scroll` — BangDuLieu luôn đặt `scroll`, nên test nào cũng chạm tới. jsdom
// không có sẵn cả hai.
beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
  w.ResizeObserver =
    w.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  (globalThis as unknown as Record<string, unknown>).ResizeObserver = w.ResizeObserver;
  w.matchMedia =
    w.matchMedia ||
    ((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }));
});

interface Dong {
  id: string;
  ten: string;
}

const COT: ColumnsType<Dong> = [{ title: 'Tên', dataIndex: 'ten', key: 'ten' }];
const DU_LIEU: Dong[] = [{ id: '1', ten: 'Cái' }];

const thanh = (c: HTMLElement) => c.querySelector('.bdl-thanh') as HTMLElement;

describe('BangDuLieu', () => {
  it('đang tải thì dải bật, và dữ liệu cũ VẪN nằm nguyên trên bảng', () => {
    const { container } = render(
      <BangDuLieu<Dong> columns={COT} dataSource={DU_LIEU} rowKey="id" loading />,
    );
    expect(thanh(container).dataset.dangTai).toBe('1');
    expect(screen.getByText('Cái')).toBeTruthy();
  });

  it('không tải thì dải tắt nhưng vẫn chiếm chỗ — bảng không nhảy', () => {
    const { container } = render(
      <BangDuLieu<Dong> columns={COT} dataSource={DU_LIEU} rowKey="id" />,
    );
    expect(thanh(container).dataset.dangTai).toBe('0');
    expect(thanh(container)).toBeTruthy();
  });

  it('KHÔNG rò `loading` xuống antd — không được có spinner che bảng', () => {
    const { container } = render(
      <BangDuLieu<Dong> columns={COT} dataSource={DU_LIEU} rowKey="id" loading />,
    );
    expect(container.querySelector('.ant-spin')).toBeNull();
  });

  it('lần tải đầu chưa có dòng nào thì không báo "không có dữ liệu"', () => {
    const { container } = render(
      <BangDuLieu<Dong> columns={COT} dataSource={[]} rowKey="id" loading />,
    );
    expect(container.textContent).not.toMatch(/No data|Không có dữ liệu/i);
  });

  it('tải xong mà thật sự rỗng thì vẫn phải báo cho người dùng biết', () => {
    const { container } = render(
      <BangDuLieu<Dong> columns={COT} dataSource={[]} rowKey="id" />,
    );
    expect(container.textContent).toMatch(/No data|Không có dữ liệu/i);
  });

  it('mọi bảng dùng dòng nhỏ', () => {
    const { container } = render(
      <BangDuLieu<Dong> columns={COT} dataSource={DU_LIEU} rowKey="id" />,
    );
    expect(container.querySelector('.ant-table-small')).toBeTruthy();
  });
});
