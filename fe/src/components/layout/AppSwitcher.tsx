import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Button, Typography } from 'antd';
import {
  AppstoreOutlined,
  CalculatorOutlined,
  CheckSquareOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { identityApps, decodeApps, CURRENT_APP_ID, type IdentityApp } from '@/services/identitySession';
import { getAuthToken } from '@/services/base/service-base';
import { useAuth } from '@/contexts/AuthContext';

// Tên app hiện tại (Kế toán).
const APP_NAME = 'Kế toán';

// Màu + icon theo app — KHỚP portal Identity (AppPicker).
const APP_STYLE: Record<string, { bg: string; icon: ReactNode }> = {
  'ke-toan': { bg: '#1f7769', icon: <CalculatorOutlined /> },
  'giao-viec': { bg: '#2f6fed', icon: <CheckSquareOutlined /> },
};
const PALETTE = ['#e8453c', '#2f6fed', '#1f7769', '#f59e0b', '#7c3aed', '#0ea5e9'];

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
      <Button
        type="text"
        onClick={() => setOpen(true)}
        aria-label="Chuyển ứng dụng"
        className="!flex items-center gap-2 !text-foreground"
      >
        <AppstoreOutlined style={{ fontSize: 16 }} />
        <span className="hidden sm:inline font-medium max-w-[160px] truncate">
          {currentName}
        </span>
      </Button>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={480}
        centered
        destroyOnHidden
      >
        <div className="pt-2 pb-1 text-center">
          <Typography.Title level={4} style={{ margin: '0 0 4px', fontWeight: 700 }}>
            Chọn ứng dụng
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Chọn một ứng dụng để tiếp tục
          </Typography.Text>
        </div>

        <div className="flex flex-wrap justify-center gap-9 py-8">
          {list.map((a, i) => {
            const st = APP_STYLE[a.appId] ?? {
              bg: PALETTE[i % PALETTE.length],
              icon: <AppstoreOutlined />,
            };
            const isCurrent = a.appId === CURRENT_APP_ID;
            const enabled = isEnabled(a.appId);
            return (
              <div
                key={a.appId}
                onClick={() => switchTo(a)}
                title={!enabled ? 'Ứng dụng chưa được bật cho công ty này' : undefined}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: 84,
                  cursor: isCurrent ? 'default' : enabled ? 'pointer' : 'not-allowed',
                  opacity: enabled ? 1 : 0.4,
                }}
                onMouseEnter={(e) => {
                  if (isCurrent || !enabled) return;
                  const t = e.currentTarget.firstElementChild as HTMLElement;
                  if (t) {
                    t.style.transform = 'translateY(-4px)';
                    t.style.boxShadow = '0 12px 28px rgba(0,0,0,0.20)';
                  }
                }}
                onMouseLeave={(e) => {
                  const t = e.currentTarget.firstElementChild as HTMLElement;
                  if (t) {
                    t.style.transform = 'none';
                    t.style.boxShadow = '0 4px 14px rgba(0,0,0,0.14)';
                  }
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: 72,
                    height: 72,
                    borderRadius: 22,
                    background: enabled ? st.bg : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 30,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.14)',
                    transition: 'transform 0.18s, box-shadow 0.18s',
                    outline: isCurrent ? '3px solid hsl(var(--primary))' : 'none',
                    outlineOffset: 2,
                    filter: enabled ? 'none' : 'grayscale(1)',
                  }}
                >
                  {a.iconUrl ? (
                    <img
                      src={a.iconUrl}
                      alt=""
                      style={{ width: 40, height: 40, objectFit: 'contain' }}
                    />
                  ) : (
                    st.icon
                  )}
                  {isCurrent && (
                    <CheckCircleFilled
                      style={{
                        position: 'absolute',
                        right: -6,
                        top: -6,
                        color: 'hsl(var(--primary))',
                        fontSize: 20,
                        background: '#fff',
                        borderRadius: '50%',
                      }}
                    />
                  )}
                </div>
                <span
                  style={{ marginTop: 10, textAlign: 'center', fontSize: 13, lineHeight: 1.3 }}
                  className="text-muted-foreground"
                >
                  {a.name}
                </span>
                {isCurrent ? (
                  <span className="text-[11px] text-primary font-medium">Đang dùng</span>
                ) : !enabled ? (
                  <span className="text-[11px] text-muted-foreground">Chưa bật</span>
                ) : null}
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
}

export default AppSwitcher;
