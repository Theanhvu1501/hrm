import { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Button,
  Form,
  Select,
  Input,
  Tag,
  Space,
  Popconfirm,
  Radio,
  message,
  Modal,
  Result,
} from 'antd';
import { UserAddOutlined, DeleteOutlined, EditOutlined, UserOutlined, TeamOutlined, KeyOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { tenantService, TenantMember, AddMemberDto } from '@/services/tenantService';
import { apiErrorMessage } from '@/config/api';
import { vaiTroService, VaiTroResponse } from '@/services/vaiTroService';
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';
import { useTableColumnFilters } from '@/components/table/useTableColumnFilters';
import type { ColumnsType } from 'antd/es/table';


const DEFAULT_PASSWORD = '123456';

type AddMode = 'new' | 'existing';

interface UserOption {
  id: string;
  email: string;
  hoTen: string;
}

const ThanhVienPage = () => {
  const { currentTenant, hasPermission } = useAuth();
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<TenantMember | null>(null);
  const [addMode, setAddMode] = useState<AddMode>('new');
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const tenantId = currentTenant?.tenantId;
  const canEdit = hasPermission('/cau-hinh/thanh-vien:sua');
  const { filterable, matches, hasPinned } = useTableColumnFilters('cau-hinh-thanh-vien');

  const fetchMembers = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const data = await tenantService.getMembers(tenantId);
      setMembers(data);
    } catch {
      message.error('Không thể tải danh sách thành viên');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await tenantService.getAllUsers();
      setUsers(data);
    } catch {
      // getAllUsers requires SuperAdmin — Admin won't have access, that's OK
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await vaiTroService.getAll();
      setRoles(
        data
          .filter((vt: VaiTroResponse) => vt.isActive)
          .map((vt: VaiTroResponse) => ({
            value: vt.ten,
            label: vt.ten,
          })),
      );
    } catch {
      // fallback nếu API lỗi
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchUsers();
    fetchRoles();
  }, [tenantId]);

  const handleAdd = async (values: Record<string, string>) => {
    if (!tenantId) return;
    try {
      const dto: AddMemberDto = { role: values.role };
      if (addMode === 'existing') {
        dto.userId = values.userId;
      } else {
        dto.email = values.email;
        dto.hoTen = values.hoTen;
        if (values.password) dto.password = values.password;
      }
      const result = await tenantService.addMember(tenantId, dto);
      message.success(
        result.isNew
          ? `Đã tạo tài khoản ${result.user.email} và thêm vào công ty`
          : `Đã thêm ${result.user.hoTen} vào công ty`,
      );
      setAddModalVisible(false);
      addForm.resetFields();
      fetchMembers();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Không thể thêm thành viên'));
    }
  };

  const handleEdit = async () => {
    if (!editingMember || !tenantId) return;
    try {
      const values = editForm.getFieldsValue() as { hoTen: string; email: string; role: string };
      if (values.hoTen !== editingMember.hoTen || values.email !== editingMember.email) {
        await tenantService.updateMemberProfile(tenantId, editingMember.id, {
          hoTen: values.hoTen,
          email: values.email,
        });
      }
      if (values.role !== editingMember.role) {
        await tenantService.updateMember(tenantId, editingMember.id, { role: values.role });
      }
      message.success('Đã cập nhật thành viên');
      setEditingMember(null);
      fetchMembers();
    } catch (e) {
      message.error(apiErrorMessage(e, 'Không thể cập nhật thành viên'));
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!tenantId) return;
    try {
      const res = await tenantService.resetMemberPassword(tenantId, userId);
      message.success(`Đã reset mật khẩu về ${res.defaultPassword}`);
    } catch {
      message.error('Không thể reset mật khẩu');
    }
  };

  const handleRemove = async (userId: string) => {
    if (!tenantId) return;
    try {
      await tenantService.removeMember(tenantId, userId);
      message.success('Đã xóa thành viên khỏi công ty');
      fetchMembers();
    } catch {
      message.error('Không thể xóa thành viên');
    }
  };

  const openAddModal = () => {
    setAddMode('new');
    addForm.resetFields();
    addForm.setFieldsValue({ password: DEFAULT_PASSWORD });
    setAddModalVisible(true);
  };

  const availableUsers = users.filter(
    (u) => !members.some((m) => m.id === u.id && m.isActive),
  );

  const columns: ColumnsType<TenantMember> = [
    filterable<TenantMember>({
      title: 'Họ tên',
      dataIndex: 'hoTen',
      key: 'hoTen',
    }),
    filterable<TenantMember>({
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    }),
    filterable<TenantMember>({
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) =>
        role ? <Tag color="blue">{role}</Tag> : <span className="text-gray-400">—</span>,
    }),
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Hoạt động' : 'Vô hiệu'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: unknown, record: TenantMember) => (
        <Space>
          {canEdit && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingMember(record);
                editForm.setFieldsValue({
                  hoTen: record.hoTen,
                  email: record.email,
                  role: record.role,
                });
              }}
            />
          )}
          {canEdit && (
            <Popconfirm
              title="Reset mật khẩu về mặc định?"
              description="Mật khẩu sẽ được đặt lại thành 123456."
              onConfirm={() => handleResetPassword(record.id)}
              okText="Reset"
              cancelText="Hủy"
            >
              <Button type="text" icon={<KeyOutlined />} title="Reset mật khẩu" />
            </Popconfirm>
          )}
          <Popconfirm
            title="Xác nhận xóa thành viên?"
            onConfirm={() => handleRemove(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Bọc filterable TRƯỚC rồi mới đưa vào useTableTitleConfig (hook ẩn/hiện + đổi tiêu đề chỉ
  // spread lại cột nên giữ nguyên filterDropdown + fixed).
  const { columns: cfgColumns, settingsButton } = useTableTitleConfig<TenantMember>(
    'cauHinh.thanhVien',
    columns,
  );
  const fl = useFieldLabels('cauHinh.thanhVien');

  const rows = useMemo(
    () =>
      members.filter((m) =>
        matches(m, (row, key) => {
          if (key === 'hoTen') return row.hoTen;
          if (key === 'email') return row.email;
          if (key === 'role') return row.role;
          return undefined;
        }),
      ),
    [members, matches],
  );

  if (!tenantId) {
    return (
      <div className="space-y-3">
        <Result
          status="warning"
          title="Chưa chọn công ty"
          subTitle="Vui lòng chọn công ty trước khi quản lý thành viên."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TeamOutlined /> Quản lý Thành viên
          </h1>
          <p className="text-gray-500 mt-1">
            Quản lý thành viên trong {currentTenant?.tenantName || 'công ty'}
          </p>
        </div>
        <Space>
          {settingsButton}
          <Button type="primary" icon={<UserAddOutlined />} onClick={openAddModal}>
            Thêm thành viên
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

      {/* Add Member Modal */}
      <Modal
        title="Thêm thành viên"
        open={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        footer={null}
        width={450}
      >
        <Form form={addForm} layout="vertical" onFinish={handleAdd}>
          <Form.Item label="Cách thêm">
            <Radio.Group value={addMode} onChange={(e) => setAddMode(e.target.value)}>
              <Radio.Button value="new">
                <UserAddOutlined /> Tạo mới
              </Radio.Button>
              {availableUsers.length > 0 && (
                <Radio.Button value="existing">
                  <UserOutlined /> User có sẵn
                </Radio.Button>
              )}
            </Radio.Group>
          </Form.Item>

          {addMode === 'existing' ? (
            <Form.Item
              name="userId"
              label={fl('userId', 'Chọn User')}
              rules={[{ required: true, message: 'Vui lòng chọn user' }]}
            >
              <Select
                showSearch
                placeholder="Tìm user..."
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase()) ||
                  (option?.email ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={availableUsers.map((u) => ({
                  value: u.id,
                  label: u.hoTen,
                  email: u.email,
                }))}
                optionRender={(option) => (
                  <div className="flex flex-col">
                    <span>{option.data.label}</span>
                    <span className="text-xs text-gray-400">{option.data.email}</span>
                  </div>
                )}
              />
            </Form.Item>
          ) : (
            <>
              <Form.Item
                name="hoTen"
                label={fl('hoTen', 'Họ tên')}
                rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
              >
                <Input placeholder="VD: Nguyễn Văn A" />
              </Form.Item>
              <Form.Item
                name="email"
                label={fl('email', 'Email')}
                rules={[
                  { required: true, message: 'Vui lòng nhập email' },
                  { type: 'email', message: 'Email không hợp lệ' },
                ]}
              >
                <Input placeholder="VD: user@congty.com" />
              </Form.Item>
              <Form.Item
                name="password"
                label={fl('password', 'Mật khẩu')}
                extra={`Mặc định: ${DEFAULT_PASSWORD}`}
              >
                <Input.Password placeholder="Nhập mật khẩu" />
              </Form.Item>
            </>
          )}

          <Form.Item
            name="role"
            label={fl('role', 'Vai trò')}
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          >
            <Select placeholder="Chọn vai trò" options={roles} />
          </Form.Item>

          <Form.Item className="mb-0 flex justify-end">
            <Space>
              <Button onClick={() => setAddModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">Thêm</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Member Modal */}
      <Modal
        title={`Sửa thành viên - ${editingMember?.hoTen || ''}`}
        open={!!editingMember}
        onCancel={() => setEditingMember(null)}
        onOk={handleEdit}
        okText="Cập nhật"
        cancelText="Hủy"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="hoTen"
            label={fl('hoTen', 'Họ tên')}
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input placeholder="VD: Nguyễn Văn A" />
          </Form.Item>
          <Form.Item
            name="email"
            label={fl('email', 'Email')}
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input placeholder="VD: user@congty.com" />
          </Form.Item>
          <Form.Item name="role" label={fl('role', 'Vai trò')}>
            <Select options={roles} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ThanhVienPage;
