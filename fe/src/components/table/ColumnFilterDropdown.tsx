import React, { useEffect, useState } from 'react';
import { Button, Divider, Input, Select, Space } from 'antd';
import { PushpinOutlined } from '@ant-design/icons';
import {
  DEFAULT_NUMBER_OP,
  DEFAULT_TEXT_OP,
  NUMBER_OPS,
  TEXT_OPS,
  isValuelessOp,
  parseFilterNumber,
  type ColumnFilter,
  type FilterKind,
  type NumberOp,
  type TextOp,
} from './columnFilter';

interface Props {
  /** Nhãn cột, hiện ở dòng "Lọc {title}". */
  title: string;
  /** Cột chữ hay cột số — quyết định danh sách toán tử và cách nhập giá trị. */
  kind: FilterKind;
  filter: ColumnFilter | undefined;
  pinned: boolean;
  onApply: (filter: ColumnFilter | undefined) => void;
  onTogglePin: () => void;
  /** antd cấp sẵn: đóng popover. */
  onClose: () => void;
}

const defaultOpOf = (kind: FilterKind): TextOp | NumberOp =>
  kind === 'number' ? DEFAULT_NUMBER_OP : DEFAULT_TEXT_OP;

/**
 * Popover lọc ở header cột: cố định cột + chọn toán tử + nhập giá trị.
 * Giá trị gõ dở chỉ nằm trong state cục bộ — bảng chỉ lọc lại khi bấm "Lọc" (hoặc Enter).
 */
const ColumnFilterDropdown: React.FC<Props> = ({
  title,
  kind,
  filter,
  pinned,
  onApply,
  onTogglePin,
  onClose,
}) => {
  const current = filter && filter.kind === kind ? filter : undefined;
  const [op, setOp] = useState<TextOp | NumberOp>(current?.op ?? defaultOpOf(kind));
  const [value, setValue] = useState(current?.value ?? '');

  // Mở lại popover sau khi bộ lọc đổi từ ngoài (vd bấm "Bỏ lọc") → hiện đúng trạng thái.
  useEffect(() => {
    const f = filter && filter.kind === kind ? filter : undefined;
    setOp(f?.op ?? defaultOpOf(kind));
    setValue(f?.value ?? '');
  }, [filter, kind]);

  const isNumber = kind === 'number';
  const valueless = isNumber && isValuelessOp(op as NumberOp);
  const invalid = isNumber && !valueless && value.trim() !== '' && parseFilterNumber(value) === null;

  const apply = () => {
    if (invalid) return;
    if (valueless) {
      onApply({ kind: 'number', op: op as NumberOp, value: '' });
      onClose();
      return;
    }
    if (value.trim() === '') {
      onApply(undefined);
      onClose();
      return;
    }
    onApply(
      isNumber
        ? { kind: 'number', op: op as NumberOp, value }
        : { kind: 'text', op: op as TextOp, value },
    );
    onClose();
  };

  const clear = () => {
    setOp(defaultOpOf(kind));
    setValue('');
    onApply(undefined);
    onClose();
  };

  return (
    <div
      style={{
        background: '#fff',
        padding: 12,
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        minWidth: 260,
      }}
      // Chặn click lọt xuống header (antd dùng click header để sort/resize).
      onClick={(e) => e.stopPropagation()}
    >
      <Button type="text" size="small" icon={<PushpinOutlined />} onClick={onTogglePin}>
        {pinned ? 'Bỏ cố định cột' : 'Cố định cột này'}
      </Button>

      <Divider style={{ margin: '8px 0' }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: 500 }}>Lọc {title}</span>
        <Select<string>
          size="small"
          variant="borderless"
          value={op}
          options={isNumber ? NUMBER_OPS : TEXT_OPS}
          onChange={(next) => setOp(next as TextOp | NumberOp)}
          style={{ minWidth: 150 }}
        />
      </div>

      {!valueless && (
        <>
          <Input
            autoFocus
            size="small"
            status={invalid ? 'error' : undefined}
            placeholder={isNumber ? 'Nhập số' : 'Nhập giá trị lọc'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onPressEnter={apply}
            style={{ marginBottom: invalid ? 4 : 12 }}
          />
          {invalid && (
            <div style={{ color: '#ff4d4f', fontSize: 12, marginBottom: 8 }}>
              Giá trị không hợp lệ
            </div>
          )}
        </>
      )}

      <Space style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button size="small" onClick={clear}>
          Bỏ lọc
        </Button>
        <Button size="small" type="primary" disabled={invalid} onClick={apply}>
          Lọc
        </Button>
      </Space>
    </div>
  );
};

export default ColumnFilterDropdown;
