import React, { useMemo } from 'react';
import { Button, Dropdown, Checkbox, Space, Divider, Tooltip } from 'antd';
import { ControlOutlined } from '@ant-design/icons';
import { REGISTRY, defaultVisibleKeys, type ChooserGroup } from './columnRegistry';

const GROUP_ORDER: ChooserGroup[] = [
  'Cơ bản', 'Chứng từ', 'Số phát sinh', 'Số dư', 'Đối tượng', 'Phân loại', 'Khác',
];

interface Props {
  visibleKeys: string[];
  onChange: (keys: string[]) => void;
}

const ColumnChooser: React.FC<Props> = ({ visibleKeys, onChange }) => {
  const visibleSet = useMemo(() => new Set(visibleKeys), [visibleKeys]);

  const toggle = (key: string, checked: boolean) => {
    // Giữ thứ tự theo REGISTRY để cột luôn hiển thị đúng vị trí.
    const next = REGISTRY.filter((c) =>
      c.key === key ? checked : visibleSet.has(c.key),
    ).map((c) => c.key);
    onChange(next);
  };

  const grouped = useMemo(
    () =>
      GROUP_ORDER.map((g) => ({
        group: g,
        items: REGISTRY.filter((c) => c.group === g),
      })).filter((s) => s.items.length > 0),
    [],
  );

  const panel = (
    <div
      style={{
        background: '#fff', padding: 12, borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)', maxHeight: 420,
        overflowY: 'auto', minWidth: 220,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <Button size="small" type="link" onClick={() => onChange(REGISTRY.map((c) => c.key))}>
          Chọn tất cả
        </Button>
        <Button size="small" type="link" onClick={() => onChange(defaultVisibleKeys())}>
          Mặc định
        </Button>
      </div>
      {grouped.map(({ group, items }) => (
        <div key={group}>
          <Divider style={{ margin: '6px 0' }} orientation="left" plain>
            {group}
          </Divider>
          <Space direction="vertical" size={2}>
            {items.map((c) => (
              <Checkbox
                key={c.key}
                checked={visibleSet.has(c.key)}
                onChange={(e) => toggle(c.key, e.target.checked)}
              >
                {c.title}
              </Checkbox>
            ))}
          </Space>
        </div>
      ))}
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
