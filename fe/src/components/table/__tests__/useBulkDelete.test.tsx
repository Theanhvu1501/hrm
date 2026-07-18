// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useBulkDelete } from '../useBulkDelete';

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

interface Row {
  id: string;
  ten: string;
}

const DATA: Row[] = [
  { id: 'a1', ten: 'Phòng Kế toán' },
  { id: 'a2', ten: 'Phòng Nhân sự' },
];

const Demo: React.FC<{
  onDeleteBatch: (ids: string[]) => Promise<{ deleted: number; skipped: number }>;
  onDone?: () => void;
  enabled?: boolean;
}> = ({ onDeleteBatch, onDone = () => {}, enabled = true }) => {
  const { rowSelection, bulkDeleteButton } = useBulkDelete<Row>({
    onDeleteBatch,
    onDone,
    enabled,
    itemLabel: 'bộ phận',
  });
  const columns: ColumnsType<Row> = [{ title: 'Tên', dataIndex: 'ten', key: 'ten' }];
  return (
    <>
      {bulkDeleteButton}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={DATA}
        pagination={false}
        rowSelection={rowSelection}
      />
    </>
  );
};

const tickRow = (index: number) => {
  const boxes = document.querySelectorAll('tbody .ant-checkbox-input');
  fireEvent.click(boxes[index] as HTMLElement);
};

const confirmModal = async () => {
  const ok = await screen.findByRole('button', { name: 'Xóa' });
  fireEvent.click(ok);
};

describe('useBulkDelete', () => {
  it('không có quyền xóa → không có checkbox, không có nút', () => {
    render(<Demo onDeleteBatch={vi.fn()} enabled={false} />);
    expect(document.querySelectorAll('tbody .ant-checkbox-input')).toHaveLength(0);
    expect(screen.queryByText(/Xóa đã chọn/)).toBeNull();
  });

  it('chưa chọn dòng nào → chưa hiện nút', () => {
    render(<Demo onDeleteBatch={vi.fn()} />);
    expect(screen.queryByText(/Xóa đã chọn/)).toBeNull();
  });

  it('chọn 2 dòng → nút hiện đúng số lượng', () => {
    render(<Demo onDeleteBatch={vi.fn()} />);
    tickRow(0);
    tickRow(1);
    expect(screen.getByText('Xóa đã chọn (2)')).toBeTruthy();
  });

  it('xác nhận → gọi API đúng danh sách id, chạy onDone, bỏ chọn hết', async () => {
    const onDeleteBatch = vi.fn(async () => ({ deleted: 2, skipped: 0 }));
    const onDone = vi.fn();
    render(<Demo onDeleteBatch={onDeleteBatch} onDone={onDone} />);

    tickRow(0);
    tickRow(1);
    fireEvent.click(screen.getByText('Xóa đã chọn (2)'));
    await confirmModal();

    await waitFor(() => expect(onDeleteBatch).toHaveBeenCalledWith(['a1', 'a2']));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(/Xóa đã chọn/)).toBeNull());
  });

  it('có dòng bị bỏ qua → API vẫn được gọi, nút biến mất sau khi xong', async () => {
    const onDeleteBatch = vi.fn(async () => ({ deleted: 1, skipped: 1 }));
    render(<Demo onDeleteBatch={onDeleteBatch} />);

    tickRow(0);
    tickRow(1);
    fireEvent.click(screen.getByText('Xóa đã chọn (2)'));
    await confirmModal();

    await waitFor(() => expect(onDeleteBatch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText(/Xóa đã chọn/)).toBeNull());
  });
});
