import { Typography } from 'antd';

const { Title } = Typography;

/**
 * Placeholder — Task 4 sẽ thay bằng trang đầy đủ (CHandler feature) quản lý
 * hồ sơ nhân viên. Task 3 chỉ cần route/menu trỏ tới được trang này.
 */
const HoSoNhanVienPage: React.FC = () => {
  return (
    <div className="space-y-3">
      <Title level={4}>Hồ sơ nhân viên</Title>
    </div>
  );
};

export default HoSoNhanVienPage;
