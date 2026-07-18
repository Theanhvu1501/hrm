import React from 'react';
import { Card, Typography, Result } from 'antd';
import { useLocation } from 'react-router-dom';
import { ToolOutlined } from '@ant-design/icons';

const { Title } = Typography;

const PlaceholderPage: React.FC = () => {
  const location = useLocation();
  
  const getPageName = () => {
    const path = location.pathname;
    const parts = path.split('/').filter(Boolean);
    return parts.map(p => p.replace(/-/g, ' ')).join(' > ');
  };

  return (
    <div>
      <Result
        icon={<ToolOutlined className="text-blue-500" />}
        title={`Trang: ${getPageName()}`}
        subTitle="Chức năng này sẽ được triển khai trong các bước tiếp theo."
      />
    </div>
  );
};

export default PlaceholderPage;
