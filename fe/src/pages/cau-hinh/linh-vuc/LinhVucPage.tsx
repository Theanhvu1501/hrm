import { useState, useEffect, useMemo } from 'react';
import {
  Table, Button, Modal, Form, Input, Switch, message, Space, Tag,
  Popconfirm, Select, InputNumber, Tree, ColorPicker, Tooltip,
} from 'antd';
import type { Key } from 'react';
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import {
  linhVucService, LinhVuc, CreateLinhVucDto, UpdateLinhVucDto,
} from '@/services/linhVucService';
import { MENU_CATALOG } from '@/config/menuCatalog';
import { ICON_WHITELIST, iconByName, isCommonKey } from '@/config/modules';
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';
import { useTableColumnFilters } from '@/components/table/useTableColumnFilters';
import type { ColumnsType } from 'antd/es/table';

const DEFAULT_LINH_VUC_CODE = 'KE_TOAN';

// Một key được coi là đã gán nếu nằm trong menuKeys (prefix-match) của bất kỳ lĩnh vực nào.
function buildAssignedMatcher(allModules: LinhVuc[]) {
  return (key: string): boolean =>
    allModules.some((m) =>
      m.menuKeys.some((k) => key === k || key.startsWith(k + '/')),
    );
}

// menuKeys (có thể là prefix) → tập catalog key thực sự được tick.
function expandCheckedKeys(menuKeys: string[]): string[] {
  return MENU_CATALOG.map((e) => e.key).filter((key) =>
    menuKeys.some((k) => key === k || key.startsWith(k + '/')),
  );
}

const LinhVucPage = () => {
  const { user, refreshModules, allModules } = useAuth();
  const [list, setList] = useState<LinhVuc[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<LinhVuc | null>(null);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [form] = Form.useForm();

  const isAssigned = useMemo(() => buildAssignedMatcher(allModules), [allModules]);
  const { filterable, matches, hasPinned } = useTableColumnFilters('cau-hinh-linh-vuc');

  const iconOptions = useMemo(
    () =>
      ICON_WHITELIST.map((name) => ({
        value: name,
        label: (
          <span className="flex items-center gap-2">
            {iconByName(name)} {name}
          </span>
        ),
      })),
    [],
  );

  // Tree data nhóm theo parentLabel; mục gốc (không parentLabel) là node lá.
  const treeData = useMemo(() => {
    const groups = new Map<string, typeof MENU_CATALOG>();
    const roots: typeof MENU_CATALOG = [];
    for (const e of MENU_CATALOG) {
      if (e.parentLabel) {
        if (!groups.has(e.parentLabel)) groups.set(e.parentLabel, []);
        groups.get(e.parentLabel)!.push(e);
      } else {
        roots.push(e);
      }
    }
    const titleOf = (key: string, label: string) => {
      const unassigned = !isCommonKey(key) && !isAssigned(key);
      return (
        <span>
          {label}
          {unassigned && <Tag color="orange" className="ml-2">chưa gán</Tag>}
        </span>
      );
    };
    return [
      ...roots.map((e) => ({ title: titleOf(e.key, e.label), key: e.key })),
      ...[...groups.entries()].map(([parent, children]) => ({
        title: parent,
        key: `group:${parent}`,
        selectable: false,
        children: children.map((e) => ({ title: titleOf(e.key, e.label), key: e.key })),
      })),
    ];
  }, [isAssigned]);

  const catalogKeySet = useMemo(() => new Set(MENU_CATALOG.map((e) => e.key)), []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await linhVucService.getAll();
      setList(data);
    } catch {
      message.error('Không thể tải danh sách lĩnh vực');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleCreate = () => {
    setEditing(null);
    setCheckedKeys([]);
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
      icon: 'AppstoreOutlined',
      color: '#1f7769',
      order: 0,
    });
    setModalVisible(true);
  };

  const handleEdit = (record: LinhVuc) => {
    setEditing(record);
    setCheckedKeys(expandCheckedKeys(record.menuKeys));
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      description: record.description,
      icon: record.icon,
      color: record.color,
      order: record.order,
      isActive: record.isActive,
    });
    setModalVisible(true);
  };

  const handleDelete = async (record: LinhVuc) => {
    try {
      await linhVucService.deleteLinhVuc(record.id);
      message.success('Đã xóa lĩnh vực');
      await fetchList();
      await refreshModules();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Không thể xóa lĩnh vực';
      message.error(msg);
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    // Chỉ lấy các key thực (loại bỏ node nhóm group:*).
    const menuKeys = checkedKeys.filter((k) => catalogKeySet.has(k));
    try {
      if (editing) {
        const dto: UpdateLinhVucDto = {
          name: values.name as string,
          description: values.description as string | undefined,
          icon: values.icon as string,
          color: values.color as string,
          order: values.order as number,
          isActive: values.isActive as boolean,
          menuKeys,
        };
        await linhVucService.update(editing.id, dto);
        message.success('Đã cập nhật lĩnh vực');
      } else {
        const dto: CreateLinhVucDto = {
          code: values.code as string,
          name: values.name as string,
          description: values.description as string | undefined,
          icon: values.icon as string,
          color: values.color as string,
          order: values.order as number,
          isActive: values.isActive as boolean,
          menuKeys,
        };
        await linhVucService.create(dto);
        message.success('Đã tạo lĩnh vực');
      }
      setModalVisible(false);
      await fetchList();
      await refreshModules();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Thao tác thất bại';
      message.error(msg);
    }
  };

  const columns: ColumnsType<LinhVuc> = [
    filterable<LinhVuc>({
      title: 'Lĩnh vực',
      key: 'name',
      render: (_: unknown, record: LinhVuc) => (
        <span className="flex items-center gap-2" style={{ color: record.color }}>
          {iconByName(record.icon)}
          <span style={{ fontWeight: 500 }}>{record.name}</span>
        </span>
      ),
    }),
    filterable<LinhVuc>({
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => (
        <code className="bg-gray-100 px-2 py-1 rounded">{code}</code>
      ),
    }),
    {
      title: 'Số menu',
      key: 'menuCount',
      render: (_: unknown, record: LinhVuc) => record.menuKeys.length,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Hoạt động' : 'Ngừng'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: unknown, record: LinhVuc) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          {record.code !== DEFAULT_LINH_VUC_CODE && (
            <Popconfirm
              title="Xác nhận xóa?"
              description="Bạn có chắc muốn xóa lĩnh vực này?"
              onConfirm={() => handleDelete(record)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const fl = useFieldLabels('cauHinh.linhVuc');
  // Bọc filterable TRƯỚC rồi mới đưa vào useTableTitleConfig (hook ẩn/hiện + đổi tiêu đề chỉ
  // spread lại cột nên giữ nguyên filterDropdown + fixed).
  const { columns: cfgColumns, settingsButton } = useTableTitleConfig<LinhVuc>(
    'cauHinh.linhVuc',
    columns,
  );

  const rows = useMemo(
    () =>
      list.filter((r) =>
        matches(r, (row, key) => (key === 'name' ? row.name : row.code)),
      ),
    [list, matches],
  );

  if (!user?.isSuperAdmin) {
    return (
      <div className="text-center text-red-500 py-6">
        Bạn không có quyền truy cập trang này. Chỉ Super Admin mới có thể quản lý lĩnh vực.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AppstoreOutlined /> Quản lý Lĩnh vực
          </h1>
          <p className="text-gray-500 mt-1">
            Cấu hình danh mục lĩnh vực và gán menu hiển thị cho từng lĩnh vực
          </p>
        </div>
        <Space>
          {settingsButton}
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Thêm lĩnh vực
          </Button>
        </Space>
      </div>

      <Table
        columns={cfgColumns}
        dataSource={rows}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        // Cột ghim (fixed) chỉ có tác dụng khi bảng cuộn ngang được → cần scroll.x.
        scroll={{ x: hasPinned ? 'max-content' : undefined }}
      />

      <Modal
        title={editing ? 'Chỉnh sửa lĩnh vực' : 'Thêm lĩnh vực mới'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={640}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="code"
            label={fl('code', 'Code (định danh, không đổi sau khi tạo)')}
            rules={[
              { required: true, message: 'Vui lòng nhập code' },
              { pattern: /^[A-Z0-9_]+$/, message: 'Code chỉ gồm chữ HOA, số và gạch dưới' },
            ]}
            extra="VD: KE_TOAN, KHO, BAN_HANG"
          >
            <Input placeholder="VD: BAN_HANG" disabled={!!editing} />
          </Form.Item>

          <Form.Item
            name="name"
            label={fl('name', 'Tên lĩnh vực')}
            rules={[{ required: true, message: 'Vui lòng nhập tên lĩnh vực' }]}
          >
            <Input placeholder="VD: Bán hàng" />
          </Form.Item>

          <Form.Item name="description" label={fl('description', 'Mô tả')}>
            <Input.TextArea rows={2} placeholder="Mô tả ngắn về lĩnh vực" />
          </Form.Item>

          <div className="flex gap-3">
            <Form.Item name="icon" label={fl('icon', 'Icon')} className="flex-1">
              <Select options={iconOptions} placeholder="Chọn icon" />
            </Form.Item>
            <Form.Item
              name="color"
              label={fl('color', 'Màu')}
              getValueFromEvent={(color) => color.toHexString()}
            >
              <ColorPicker showText />
            </Form.Item>
            <Form.Item name="order" label={fl('order', 'Thứ tự')}>
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="isActive" label={fl('isActive', 'Kích hoạt')} valuePropName="checked">
              <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
            </Form.Item>
          </div>

          <Form.Item label="Menu thuộc lĩnh vực">
            <Tooltip title="Nhãn 'chưa gán' = menu chưa thuộc lĩnh vực nào (mặc định hiển thị ở Kế toán)">
              <div className="border rounded p-2 max-h-72 overflow-auto">
                <Tree
                  checkable
                  selectable={false}
                  checkedKeys={checkedKeys}
                  onCheck={(checked) => {
                    const keys = Array.isArray(checked) ? checked : checked.checked;
                    setCheckedKeys(keys.map((k: Key) => String(k)));
                  }}
                  treeData={treeData}
                />
              </div>
            </Tooltip>
          </Form.Item>

          <Form.Item className="mb-0 flex justify-end">
            <Space>
              <Button onClick={() => setModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">
                {editing ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LinhVucPage;
