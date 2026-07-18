import React, { useMemo } from 'react';
import { Button, Checkbox, Divider, Dropdown, Space, Tooltip } from 'antd';
import { ControlOutlined } from '@ant-design/icons';

export interface ColumnChooserItem {
  key: string;
  title: string;
}

interface Props {
  items: ColumnChooserItem[];
  visibleKeys: string[];
  onChange: (keys: string[]) => void;
}

/**
 * Nút chọn cột ẩn/hiện — CHỈ icon (không chữ). Danh sách checkbox phẳng theo thứ tự cột.
 * Giữ thứ tự cột gốc khi toggle để cột luôn hiển thị đúng vị trí.
 */
const ColumnChooser: React.FC<Props> = ({ items, visibleKeys, onChange }) => {
  const visibleSet = useMemo(() => new Set(visibleKeys), [visibleKeys]);
  const allKeys = useMemo(() => items.map((i) => i.key), [items]);

  const toggle = (key: string, checked: boolean) => {
    const next = items
      .filter((i) => (i.key === key ? checked : visibleSet.has(i.key)))
      .map((i) => i.key);
    onChange(next);
  };

  const panel = (
    <div
      style={{
        background: '#fff',
        padding: 12,
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        maxHeight: 420,
        overflowY: 'auto',
        minWidth: 200,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <Button size="small" type="link" onClick={() => onChange(allKeys)}>
          Chọn tất cả
        </Button>
        <Button size="small" type="link" onClick={() => onChange(allKeys)}>
          Mặc định
        </Button>
      </div>
      <Divider style={{ margin: '4px 0' }} />
      <Space direction="vertical" size={4}>
        {items.map((i) => (
          <Checkbox
            key={i.key}
            checked={visibleSet.has(i.key)}
            onChange={(e) => toggle(i.key, e.target.checked)}
          >
            {i.title}
          </Checkbox>
        ))}
      </Space>
    </div>
  );

  return (
    <Dropdown trigger={['click']} dropdownRender={() => panel}>
      <Tooltip title="Chọn cột">
        <Button size="small" icon={<ControlOutlined />} />
      </Tooltip>
    </Dropdown>
  );
};

export default ColumnChooser;
