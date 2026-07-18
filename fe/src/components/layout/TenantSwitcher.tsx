import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dropdown, Button, Typography, message } from 'antd';
import type { MenuProps } from 'antd';
import { BankOutlined, CheckOutlined, DownOutlined, SwapOutlined, LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

export function TenantSwitcher() {
  const { currentTenant, availableTenants, switchTenant } = useAuth();
  const [switching, setSwitching] = useState(false);

  // Don't show switcher if user has only 1 or no tenants
  if (availableTenants.length <= 1) {
    if (!currentTenant) return null;

    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BankOutlined />
        <Text className="!text-foreground">{currentTenant.tenantName}</Text>
      </div>
    );
  }

  const handleSwitch = async (tenantId: string) => {
    if (tenantId === currentTenant?.tenantId || switching) return;

    setSwitching(true);
    try {
      await switchTenant(tenantId);
    } catch {
      message.error('Không thể chuyển công ty. Vui lòng thử lại.');
      setSwitching(false);
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'header',
      label: (
        <Text strong className="flex items-center gap-1">
          <SwapOutlined /> Chuyển công ty
        </Text>
      ),
      disabled: true,
    },
    { type: 'divider' },
    ...availableTenants.map((tenant) => ({
      key: tenant.tenantId,
      label: (
        <div className="flex items-center justify-between min-w-[160px]">
          <div className="flex flex-col">
            <span>{tenant.tenantName || tenant.tenantId}</span>
            <span className="text-xs text-gray-400">{tenant.role}</span>
          </div>
          {currentTenant?.tenantId === tenant.tenantId && (
            <CheckOutlined className="text-primary ml-2" />
          )}
        </div>
      ),
      onClick: () => handleSwitch(tenant.tenantId),
    })),
  ];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      placement="bottomRight"
      trigger={['click']}
      disabled={switching}
    >
      <Button type="text" className="flex items-center gap-2 !text-foreground">
        <BankOutlined />
        <span className="hidden sm:inline">{currentTenant?.tenantName}</span>
        {switching ? <LoadingOutlined className="text-xs" /> : <DownOutlined className="text-xs" />}
      </Button>
    </Dropdown>
  );
}
