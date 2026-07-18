import { useAuth } from "@/contexts/AuthContext";
import {
  ExportOutlined,
  MailOutlined,
  SafetyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Descriptions,
  Tabs,
  Tag,
  Typography,
} from "antd";

const { Title, Text } = Typography;

// Trang quản lý tài khoản trên Portal MasterCeo (SSO). Mặc định trỏ identity URL.
const IDENTITY_URL = import.meta.env.VITE_IDENTITY_URL as string | undefined;
const accountSettingsUrl = IDENTITY_URL
  ? `${IDENTITY_URL.replace(/\/$/, "")}/admin/profile`
  : undefined;

const ProfilePage = () => {
  const { user, currentTenant } = useAuth();

  const currentRole = currentTenant?.role;
  const roleLabel = currentRole || "Chưa gán vai trò";

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Text type="secondary">Vui lòng đăng nhập</Text>
      </div>
    );
  }

  const tabItems = [
    {
      key: "info",
      label: (
        <span>
          <UserOutlined className="mr-2" />
          Thông tin cá nhân
        </span>
      ),
      children: (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="lg:col-span-1">
            <div className="text-center">
              <Avatar
                size={100}
                style={{ backgroundColor: "#1890ff" }}
                icon={<UserOutlined />}
                className="mb-4"
              />
              <Title level={4} className="!mb-1">
                {user.hoTen}
              </Title>
              <Text type="secondary" className="block mb-3">
                {user.email}
              </Text>
              <Tag color="blue" className="text-sm">
                {roleLabel}
              </Tag>
            </div>
          </Card>

          {/* Read-only info + link sang Portal */}
          <Card title="Thông tin tài khoản" className="lg:col-span-2">
            <Descriptions column={1} bordered size="small" className="mb-4">
              <Descriptions.Item label="Họ và tên">
                {user.hoTen}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                <span className="inline-flex items-center gap-2">
                  <MailOutlined className="text-muted-foreground" />
                  {user.email}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Vai trò">
                <Tag color="blue">{roleLabel}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Alert
              type="info"
              showIcon
              message="Quản lý tài khoản tập trung tại MasterCeo"
              description="Họ tên và mật khẩu được quản lý tại cổng tài khoản chung MasterCeo. Mọi thay đổi sẽ áp dụng cho tất cả ứng dụng."
              className="mb-4"
            />

            {accountSettingsUrl ? (
              <Button
                type="primary"
                icon={<ExportOutlined />}
                href={accountSettingsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Quản lý tài khoản tại MasterCeo
              </Button>
            ) : (
              <Text type="secondary">
                Liên hệ quản trị viên để thay đổi thông tin tài khoản.
              </Text>
            )}
          </Card>
        </div>
      ),
    },
    {
      key: "permissions",
      label: (
        <span>
          <SafetyOutlined className="mr-2" />
          Quyền hạn
        </span>
      ),
      children: (
        <Card title="Quyền hạn của bạn">
          <Descriptions column={1} bordered size="small" className="mb-6">
            <Descriptions.Item label="Vai trò">
              <Tag color="blue">{roleLabel}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={user.trangThai === "HOAT_DONG" ? "success" : "error"}>
                {user.trangThai === "HOAT_DONG" ? "Đang hoạt động" : "Đã khóa"}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <Title level={3} className="!mb-1">
          Thông tin cá nhân
        </Title>
        <Text type="secondary">Xem thông tin tài khoản và quyền hạn</Text>
      </div>

      {/* Tabs */}
      <Tabs items={tabItems} defaultActiveKey="info" size="large" />
    </div>
  );
};

export default ProfilePage;
