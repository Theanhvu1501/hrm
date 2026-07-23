import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  attendanceRecordService,
  TrangThaiHomNay,
} from '@/services/attendanceRecordService';
import { layStatus } from '@/pages/cham-cong/cua-toi/trangThai';

interface HoSoChamCongState {
  hoSo: TrangThaiHomNay | null;
  /**
   * CHỈ true khi `/hom-nay` trả 404 — tài khoản chưa được gắn với hồ sơ
   * nhân viên. Đây là trường hợp có thật (ngày đầu đi làm) và HR sửa được.
   * Rớt mạng, 500 hay token hết hạn KHÔNG được gộp vào đây — nếu gộp,
   * người dùng bị đẩy đi báo HR một chuyện HR không sửa được. Dùng lại
   * `layStatus` (trangThai.ts) — nguồn phân loại 404 duy nhất, không tự bịa
   * cách đọc thứ hai.
   */
  chuaLienKet: boolean;
  dangTai: boolean;
}

const HoSoChamCongContext = createContext<HoSoChamCongState | undefined>(
  undefined,
);

/**
 * Nạp hồ sơ chấm công hôm nay (`/hom-nay`) MỘT LẦN ở cấp vỏ `/toi`, chia sẻ
 * cho mọi màn hình con cần một dòng thông tin tĩnh (vd phòng ban ở header,
 * ở tab Tài khoản) — thay vì mỗi nơi tự gọi lại API.
 *
 * KHÔNG dùng cho trang Chấm công: trang đó cần luồng phản ứng đầy đủ (chấm
 * xong phải nạp lại ngay) nên vẫn giữ nguyên CHandler fetch riêng của nó.
 * Provider này chỉ đọc một lần khi vỏ mở lên, không có cách nào nạp lại.
 */
export function HoSoChamCongProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [hoSo, setHoSo] = useState<TrangThaiHomNay | null>(null);
  const [chuaLienKet, setChuaLienKet] = useState(false);
  const [dangTai, setDangTai] = useState(true);

  useEffect(() => {
    // Cờ huỷ: vỏ /toi sống suốt phiên nên effect này hiếm khi unmount giữa
    // chừng, nhưng StrictMode (dev) mount/unmount kép sẽ gọi lại — không có
    // cờ này, response của lần gọi đầu (đã huỷ) vẫn có thể ghi đè state của
    // lần gọi sau.
    let huy = false;

    attendanceRecordService
      .homNay()
      .then((ketQua) => {
        if (huy) return;
        setHoSo(ketQua);
      })
      .catch((err) => {
        if (huy) return;
        console.error('Tải hồ sơ chấm công hôm nay lỗi:', err);
        // Chỉ 404 mới là "chưa gắn hồ sơ" — xem giải thích ở khai báo
        // `chuaLienKet` phía trên.
        if (layStatus(err) === 404) setChuaLienKet(true);
      })
      .finally(() => {
        if (!huy) setDangTai(false);
      });

    return () => {
      huy = true;
    };
  }, []);

  return (
    <HoSoChamCongContext.Provider value={{ hoSo, chuaLienKet, dangTai }}>
      {children}
    </HoSoChamCongContext.Provider>
  );
}

/**
 * Đọc hồ sơ chấm công hôm nay đã nạp sẵn ở `HoSoChamCongProvider`.
 *
 * Ném lỗi rõ ràng khi gọi ngoài provider thay vì âm thầm trả về giá trị mặc
 * định `dangTai: true` mãi mãi — lỗi lắp ráp nên lộ ra ngay lúc phát triển,
 * không phải thành một màn hình "Đang tải…" treo vô thời hạn ở production.
 */
export function useHoSoChamCong(): HoSoChamCongState {
  const ctx = useContext(HoSoChamCongContext);
  if (!ctx) {
    throw new Error(
      'useHoSoChamCong() phải được gọi bên trong HoSoChamCongProvider',
    );
  }
  return ctx;
}
