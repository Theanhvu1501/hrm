import { useEffect } from 'react';
import { notification, Button } from 'antd';
import { registerSW } from 'virtual:pwa-register';
import { isNativeApp } from '../../appTarget';

// Kiểm tra bản mới mỗi 60s khi app đang mở (không cần đóng/mở lại để nhận update).
const UPDATE_CHECK_INTERVAL = 60 * 1000;

/**
 * Đăng ký service worker ở chế độ prompt: khi có bản deploy mới, hiện thông báo
 * "Đã có phiên bản mới" + nút "Tải lại". Người dùng tự bấm khi sẵn sàng (an toàn khi đang nhập liệu).
 */
export default function PWAUpdatePrompt() {
  useEffect(() => {
    // Capacitor tự phục vụ asset offline — không đăng ký service worker trong native
    // để tránh xung đột scheme capacitor:// với Workbox.
    if (isNativeApp()) return;

    let timer: ReturnType<typeof setInterval> | undefined;

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        notification.open({
          key: 'pwa-update',
          message: 'Đã có phiên bản mới',
          description: 'Nhấn "Tải lại" để cập nhật giao diện mới nhất.',
          duration: 0,
          placement: 'bottomRight',
          btn: (
            <Button type="primary" size="small" onClick={() => updateSW(true)}>
              Tải lại
            </Button>
          ),
        });
      },
      onRegisteredSW(_swUrl, registration) {
        if (registration) {
          timer = setInterval(() => registration.update(), UPDATE_CHECK_INTERVAL);
        }
      },
    });

    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  return null;
}
