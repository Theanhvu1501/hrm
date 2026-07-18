import React, { useCallback, useState } from 'react';
import { Button, Modal, message } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

export interface BulkDeleteResult {
  deleted: number;
  skipped: number;
}

export interface UseBulkDeleteOptions {
  /** Gọi API xóa lô. */
  onDeleteBatch: (ids: string[]) => Promise<BulkDeleteResult>;
  /** Chạy sau khi xóa xong — thường là tải lại danh sách. */
  onDone: () => void;
  /** Không có quyền xóa → không hiện checkbox lẫn nút. */
  enabled: boolean;
  /** Nhãn trong câu xác nhận, vd "bộ phận". */
  itemLabel: string;
}

/**
 * Checkbox chọn dòng + nút "Xóa đã chọn (N)" cho bảng antd.
 *
 * Lựa chọn CHỈ có hiệu lực trong trang đang xem: trang phải gọi `clearSelection()` khi đổi trang,
 * đổi bộ lọc / tìm kiếm hoặc tải lại — để cái bị xóa đúng là cái người dùng đang nhìn thấy.
 */
export function useBulkDelete<T extends { id: string }>({
  onDeleteBatch,
  onDone,
  enabled,
  itemLabel,
}: UseBulkDeleteOptions) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const doDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const { deleted, skipped } = await onDeleteBatch(selectedIds);
      if (skipped > 0) {
        message.warning(`Đã xóa ${deleted} mục, bỏ qua ${skipped} mục không xóa được`);
      } else {
        message.success(`Đã xóa ${deleted} mục`);
      }
      setSelectedIds([]);
      onDone();
    } catch {
      message.error('Xóa hàng loạt thất bại');
    } finally {
      setDeleting(false);
    }
  }, [onDeleteBatch, onDone, selectedIds]);

  const confirmDelete = useCallback(() => {
    Modal.confirm({
      title: `Xóa ${selectedIds.length} ${itemLabel} đã chọn?`,
      icon: <ExclamationCircleOutlined />,
      content: 'Thao tác không hoàn tác.',
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: doDelete,
    });
  }, [doDelete, itemLabel, selectedIds.length]);

  const rowSelection = enabled
    ? {
        selectedRowKeys: selectedIds as React.Key[],
        onChange: (keys: React.Key[]) => setSelectedIds(keys.map(String)),
        columnWidth: 32,
      }
    : undefined;

  const bulkDeleteButton =
    enabled && selectedIds.length > 0 ? (
      <Button danger icon={<DeleteOutlined />} loading={deleting} onClick={confirmDelete}>
        Xóa đã chọn ({selectedIds.length})
      </Button>
    ) : null;

  return {
    rowSelection,
    bulkDeleteButton,
    clearSelection,
    selectedCount: selectedIds.length,
  };
}
