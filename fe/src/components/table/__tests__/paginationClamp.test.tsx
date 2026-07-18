// @vitest-environment jsdom
// Chốt chặn: các bảng phân trang client dựa vào việc antd TỰ lùi về trang hợp lệ khi lọc làm
// dataSource co lại. Nếu antd đổi hành vi này, mọi bảng có lọc + phân trang sẽ hiện trang trống.
import React, { useState } from 'react';
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Table } from 'antd';

beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
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
  w.ResizeObserver =
    w.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
});

const ALL = Array.from({ length: 12 }, (_, i) => ({ key: String(i), ten: `Dòng ${i}` }));

const Demo: React.FC = () => {
  const [filtered, setFiltered] = useState(false);
  const rows = filtered ? [ALL[0]] : ALL;
  return (
    <>
      <button onClick={() => setFiltered(true)}>lọc</button>
      <Table
        columns={[{ title: 'Tên', dataIndex: 'ten', key: 'ten' }]}
        dataSource={rows}
        pagination={{ pageSize: 10 }}
      />
    </>
  );
};

describe('antd pagination khi dataSource co lại', () => {
  it('đang ở trang 2, lọc còn 1 dòng → antd lùi về trang 1 và hiện dòng khớp', async () => {
    render(<Demo />);
    fireEvent.click(screen.getByTitle('2')); // sang trang 2
    await waitFor(() => expect(screen.getByText('Dòng 10')).toBeTruthy());

    fireEvent.click(screen.getByText('lọc'));

    await waitFor(() => expect(screen.queryByText('Dòng 10')).toBeNull());
    // Nếu antd KHÔNG clamp, bảng sẽ rỗng và dòng 0 không xuất hiện.
    expect(screen.queryByText('Dòng 0')).toBeTruthy();
  });
});
