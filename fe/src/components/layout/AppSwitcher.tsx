import { useEffect, useState } from 'react';
import { Modal, Button } from 'antd';
import { identityApps, decodeApps, CURRENT_APP_ID, type IdentityApp } from '@/services/identitySession';
import { getAuthToken } from '@/services/base/service-base';
import { useAuth } from '@/contexts/AuthContext';
import { IconLuoiApp } from '@/components/icons/IconLuoiApp';
import { ManChonUngDung } from './ManChonUngDung';

// Tên app hiện tại.
const APP_NAME = 'Nhân sự';

export function AppSwitcher() {
  const [apps, setApps] = useState<IdentityApp[]>([]);
  const [allowed, setAllowed] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const { currentTenant } = useAuth();

  useEffect(() => {
    identityApps()
      .then(setApps)
      .catch(() => setApps([]));
    // App BẬT cho công ty hiện tại = claim `apps` trong token hiện tại.
    setAllowed(decodeApps(getAuthToken()));
  }, [currentTenant?.tenantId]);

  const tenantId = currentTenant?.tenantId ?? '';
  const isEnabled = (appId: string) => appId === CURRENT_APP_ID || allowed.includes(appId);

  const current = apps.find((a) => a.appId === CURRENT_APP_ID);
  const currentName = current?.name ?? APP_NAME;

  // Nếu Identity trả [] → vẫn hiện tile app hiện tại.
  const list: IdentityApp[] = apps.length
    ? apps
    : [{ appId: CURRENT_APP_ID, name: APP_NAME, feUrl: '' }];

  const switchTo = (app: IdentityApp) => {
    if (app.appId === CURRENT_APP_ID || !app.feUrl || !isEnabled(app.appId)) return;
    // Giữ nguyên công ty đang chọn khi chuyển app.
    window.location.href = tenantId
      ? `${app.feUrl}/?tenant=${encodeURIComponent(tenantId)}`
      : app.feUrl;
  };

  return (
    <>
      {/* Chỉ còn icon — tên app đã bỏ theo tài liệu cải tiến 08.08.26 để nhường
          chỗ cho hàng lọc; tên vẫn hiện ở tooltip. */}
      <Button
        type="text"
        onClick={() => setOpen(true)}
        aria-label={`Chuyển ứng dụng (đang dùng ${currentName})`}
        title={currentName}
        className="!flex items-center !text-foreground"
      >
        <IconLuoiApp size={18} />
      </Button>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={560}
        centered
        destroyOnHidden
        // Bản vẽ có nút X tròn riêng trong ManChonUngDung; để antd vẽ thêm nút
        // đóng của nó nữa thì màn hiện HAI dấu X chồng nhau.
        closable={false}
      >
        <ManChonUngDung
          danhSach={list}
          appHienTai={CURRENT_APP_ID}
          daBat={isEnabled}
          tenCongTy={currentTenant?.tenantName}
          onChon={(appId) => {
            const app = list.find((a) => a.appId === appId);
            if (app) switchTo(app);
          }}
          onDong={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}

export default AppSwitcher;
