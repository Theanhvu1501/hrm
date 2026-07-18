// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render, renderHook, screen, fireEvent, waitFor } from '@testing-library/react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTableColumnFilters } from '../useTableColumnFilters';
import { readPinnedKeys, savePinnedKeys } from '../columnPin';

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
  // jsdom không có ResizeObserver — antd Table/Dropdown cần
  w.ResizeObserver =
    w.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
});

beforeEach(() => localStorage.clear());

interface Row {
  key: string;
  ten: string;
}

const DATA: Row[] = [
  { key: '1', ten: 'CÔNG TY G-LIFE' },
  { key: '2', ten: 'Công ty Vinamilk' },
];

const Demo: React.FC = () => {
  const { filterable, matches, hasPinned } = useTableColumnFilters('demo-page');
  const columns: ColumnsType<Row> = [
    filterable<Row>({ title: 'Tên đối tượng', dataIndex: 'ten', key: 'ten', width: 200 }),
    { title: 'Ghi chú', dataIndex: 'ghiChu', key: 'ghiChu', width: 200 },
  ];
  const rows = DATA.filter((r) => matches(r, (row, key) => (key === 'ten' ? row.ten : undefined)));
  return (
    <Table
      columns={columns}
      dataSource={rows}
      pagination={false}
      // Giống trang thật: cột ghim chỉ có tác dụng khi bảng cuộn ngang được.
      scroll={{ x: hasPinned ? 'max-content' : undefined }}
    />
  );
};

interface NumRow {
  key: string;
  ten: string;
  no: number;
}

const NUM_DATA: NumRow[] = [
  { key: '1', ten: 'Tiền mặt', no: 1230000 },
  { key: '2', ten: 'Tiền gửi', no: 0 },
];

const NumDemo: React.FC = () => {
  const { filterable, matches } = useTableColumnFilters('demo-num');
  const columns: ColumnsType<NumRow> = [
    { title: 'Tên', dataIndex: 'ten', key: 'ten', width: 160 },
    filterable<NumRow>(
      { title: 'Nợ', dataIndex: 'no', key: 'no', width: 140 },
      { type: 'number', filterTitle: 'Phát sinh Nợ' },
    ),
  ];
  const rows = NUM_DATA.filter((r) => matches(r, (row, key) => (key === 'no' ? row.no : undefined)));
  return <Table columns={columns} dataSource={rows} pagination={false} />;
};

const openDropdown = () => {
  // antd bọc filterIcon trong span.ant-dropdown-trigger ở header cột
  const trigger = document.querySelector('.ant-dropdown-trigger') as HTMLElement;
  expect(trigger).toBeTruthy();
  fireEvent.click(trigger);
};

describe('lọc theo cột ở header (render thật)', () => {
  it('gõ giá trị + bấm Lọc → bảng chỉ còn dòng khớp; Bỏ lọc → hiện lại đủ', async () => {
    render(<Demo />);
    expect(screen.getByText('Công ty Vinamilk')).toBeTruthy();

    openDropdown();
    fireEvent.change(await screen.findByPlaceholderText('Nhập giá trị lọc'), {
      target: { value: 'g-life' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lọc' }));

    await waitFor(() => expect(screen.queryByText('Công ty Vinamilk')).toBeNull());
    expect(screen.getByText('CÔNG TY G-LIFE')).toBeTruthy();

    openDropdown();
    fireEvent.click(await screen.findByRole('button', { name: 'Bỏ lọc' }));
    await waitFor(() => expect(screen.getByText('Công ty Vinamilk')).toBeTruthy());
  });

  it('bấm "Cố định cột này" → cột được ghim và lưu lại localStorage', async () => {
    render(<Demo />);

    openDropdown();
    fireEvent.click(await screen.findByRole('button', { name: /Cố định cột này/ }));

    await waitFor(() => expect(readPinnedKeys('demo-page')).toEqual(['ten']));

    // Mở lại: nút đã đổi thành "Bỏ cố định cột"
    openDropdown();
    expect(await screen.findByRole('button', { name: /Bỏ cố định cột/ })).toBeTruthy();
  });

  it('cột đã ghim (đọc từ localStorage) → antd nhận fixed: left', () => {
    savePinnedKeys('demo-page', ['ten']);
    const { result } = renderHook(() => useTableColumnFilters('demo-page'));

    const col = result.current.filterable({ title: 'Tên đối tượng', key: 'ten' });
    expect(col.fixed).toBe('left');
    expect(result.current.hasPinned).toBe(true);

    const other = result.current.filterable({ title: 'Ghi chú', key: 'ghiChu' });
    expect(other.fixed).toBeUndefined();
  });

  it('cột số: chọn "Lớn hơn" + nhập số → chỉ còn dòng khớp', async () => {
    render(<NumDemo />);
    expect(screen.getByText('Tiền gửi')).toBeTruthy();

    openDropdown();
    // Nhãn dùng filterTitle, không phải title cột
    expect(await screen.findByText('Lọc Phát sinh Nợ')).toBeTruthy();

    fireEvent.mouseDown(document.querySelector('.ant-select') as HTMLElement);
    fireEvent.click(await screen.findByTitle('Lớn hơn'));
    fireEvent.change(screen.getByPlaceholderText('Nhập số'), { target: { value: '1.000.000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lọc' }));

    await waitFor(() => expect(screen.queryByText('Tiền gửi')).toBeNull());
    expect(screen.getByText('Tiền mặt')).toBeTruthy();
  });

  it('cột số: gõ chữ → báo lỗi và không cho bấm Lọc', async () => {
    render(<NumDemo />);

    openDropdown();
    fireEvent.change(await screen.findByPlaceholderText('Nhập số'), { target: { value: 'abc' } });

    expect(screen.getByText('Giá trị không hợp lệ')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Lọc' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
