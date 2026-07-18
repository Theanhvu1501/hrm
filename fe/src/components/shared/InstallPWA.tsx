import React, { useEffect, useState } from 'react';
import { Button, Modal } from 'antd';
import { DownloadOutlined, ShareAltOutlined, CloseOutlined } from '@ant-design/icons';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-install-banner-dismissed';
const BANNER_HEIGHT = 48;

const isStandalone = (): boolean =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

const isIOS = (): boolean => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** Chỉ mobile/tablet (gồm iPad iPadOS 13+ báo là Macintosh). Desktop web → false (ẩn hẳn). */
const isMobileOrTablet = (): boolean => {
  const ua = navigator.userAgent;
  if (/android|iphone|ipod|ipad/i.test(ua)) return true;
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
  return false;
};

/**
 * Banner cài đặt ứng dụng — CHỈ hiện trên iPad/điện thoại, dạng thanh trên cùng đẩy nội dung
 * xuống (không đè), tắt được (nhớ trong localStorage). Trên web desktop: không hiện gì.
 * Android: bấm gọi prompt cài đặt; iOS: mở hướng dẫn Add to Home Screen.
 */
const InstallPWA: React.FC = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosOpen, setIosOpen] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(
    () => localStorage.getItem(DISMISS_KEY) === '1',
  );
  const [installed, setInstalled] = useState<boolean>(isStandalone());

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    // Cho phép menu "Cài đặt ứng dụng" gọi hiện lại banner sau khi đã tắt.
    const onReopen = () => {
      localStorage.removeItem(DISMISS_KEY);
      setDismissed(false);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('open-install-pwa', onReopen);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('open-install-pwa', onReopen);
    };
  }, []);

  const ios = isIOS();
  // Hiện khi: là mobile/tablet, chưa cài, chưa tắt, và (Android có prompt HOẶC iOS).
  const visible = isMobileOrTablet() && !installed && !dismissed && (!!deferred || ios);

  // Đẩy nội dung xuống bằng padding-top trên body để banner không che Header.
  useEffect(() => {
    if (visible) {
      document.body.style.paddingTop = `${BANNER_HEIGHT}px`;
      return () => {
        document.body.style.paddingTop = '';
      };
    }
  }, [visible]);

  if (!visible) return null;

  const handleInstall = async () => {
    if (deferred) {
      await deferred.prompt();
      const res = await deferred.userChoice;
      if (res.outcome === 'accepted') setInstalled(true);
      setDeferred(null);
    } else {
      setIosOpen(true);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: BANNER_HEIGHT,
          zIndex: 2000,
          background: '#1F3864',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,.25)',
        }}
      >
        <DownloadOutlined style={{ fontSize: 18, flexShrink: 0 }} />
        <span
          style={{
            flex: 1,
            fontSize: 14,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          Cài đặt ứng dụng Master CEO
        </span>
        <Button size="small" type="default" icon={<DownloadOutlined />} onClick={handleInstall}>
          Cài đặt
        </Button>
        <Button
          size="small"
          type="text"
          aria-label="Đóng"
          icon={<CloseOutlined style={{ color: '#fff' }} />}
          onClick={handleDismiss}
        />
      </div>

      <Modal
        title="Cài đặt lên màn hình chính (iPhone/iPad)"
        open={iosOpen}
        onCancel={() => setIosOpen(false)}
        footer={null}
      >
        <ol style={{ paddingLeft: 18, lineHeight: 2 }}>
          <li>Mở trang bằng <b>Safari</b> (không cài được qua Chrome trên iOS).</li>
          <li>
            Bấm nút <b>Chia sẻ</b> <ShareAltOutlined /> (ô vuông có mũi tên ↑) ở thanh công cụ.
          </li>
          <li>Kéo xuống chọn <b>“Thêm vào MH chính” (Add to Home Screen)</b>.</li>
          <li>Bấm <b>Thêm</b> — icon Master CEO sẽ xuất hiện như một ứng dụng.</li>
        </ol>
      </Modal>
    </>
  );
};

export default InstallPWA;
