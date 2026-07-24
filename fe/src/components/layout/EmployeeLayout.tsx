import { NavLink, Outlet } from 'react-router-dom';
import {
  ClockCircleOutlined,
  FileTextOutlined,
  TableOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { homNayVN } from '@/ultils/thoiGianVN';
import {
  HoSoChamCongProvider,
  useHoSoChamCong,
} from '@/contexts/HoSoChamCongContext';
import './employee-shell.css';

const TAB = [
  { den: '/toi/cham-cong', nhan: 'Chấm công', icon: <ClockCircleOutlined /> },
  { den: '/toi/don-tu', nhan: 'Đơn từ', icon: <FileTextOutlined /> },
  { den: '/toi/bang-cong', nhan: 'Bảng công', icon: <TableOutlined /> },
  { den: '/toi/tai-khoan', nhan: 'Tài khoản', icon: <UserOutlined /> },
];

const THU_VN = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/** "2026-07-23" → "Thứ Năm, 23/07/2026". Không dùng toLocaleDateString:
 *  kết quả phụ thuộc locale máy người xem. */
function ngayDayDu(ngay: string): string {
  const [nam, thang, ngayTrongThang] = ngay.split('-');
  const thu = THU_VN[new Date(`${ngay}T00:00:00Z`).getUTCDay()];
  return `${thu}, ${ngayTrongThang}/${thang}/${nam}`;
}

function chuDau(ten?: string): string {
  const sach = (ten ?? '').trim();
  if (!sach) return '?';
  // Chữ cái đầu của TỪ CUỐI: tên riêng người Việt nằm ở cuối, "Nguyễn Văn
  // Hải" phải ra "H" chứ không phải "N".
  const tu = sach.split(/\s+/);
  return tu[tu.length - 1].charAt(0).toUpperCase();
}

/**
 * Vỏ ứng dụng cho nhân viên: header thông tin + nội dung + 4 tab đáy.
 *
 * Tách hẳn khỏi MainLayout thay vì cho MainLayout tự đổi hình theo bề rộng:
 * hai layout phục vụ hai đối tượng khác nhau (HR ngồi máy tính với bảng
 * biểu, nhân viên đứng ở cổng công ty bấm một nút), trộn vào một file sẽ
 * làm cả hai cùng khó sửa.
 *
 * Bọc `HoSoChamCongProvider` ở NGAY ĐÂY (cấp vỏ), không phải ở App.tsx: một
 * lần nạp `/hom-nay` cho mọi route con của `/toi` dùng chung (header lấy
 * phòng ban, TaiKhoanPage lấy lại đúng dữ liệu đó thay vì tự gọi riêng —
 * xem HoSoChamCongContext.tsx). Trang Chấm công vẫn giữ nguyên CHandler
 * fetch riêng của nó, không đụng tới.
 */
export default function EmployeeLayout() {
  return (
    <HoSoChamCongProvider>
      <EmployeeShell />
    </HoSoChamCongProvider>
  );
}

/**
 * Tách riêng khỏi `EmployeeLayout` vì phải nằm BÊN TRONG
 * `HoSoChamCongProvider` mới `useHoSoChamCong()` được — một component
 * không thể vừa dựng ra Provider vừa đọc Context của chính nó trong cùng
 * một lần render.
 */
function EmployeeShell() {
  const { user, currentTenant } = useAuth();
  const { hoSo } = useHoSoChamCong();

  return (
    <div className="emp-shell mx-auto w-full max-w-[480px]">
      {/*
        Header hai dòng thay vì ba tầng như trước (tên/phòng ban → badge công
        ty → ngày riêng một dòng). Đây là màn hình mà việc chính nằm ở NÚT
        chấm công phía dưới — header càng ăn ít chiều dọc thì nút càng sớm
        nằm trong tầm ngón cái. Phòng ban và ngày gộp một dòng phụ vì cả hai
        đều là thông tin liếc qua, không phải thứ để đọc kỹ.
      */}
      <div className="emp-header sticky top-0 z-10 px-4 pb-3 pt-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 text-sm font-semibold">
            {chuDau(user?.hoTen)}
          </div>
          {/* min-w-0 để `truncate` bên trong hoạt động: thiếu nó thì tên dài
              đẩy badge công ty tràn ra khỏi màn hình thay vì bị cắt. */}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold leading-tight">
              {user?.hoTen}
            </div>
            <div className="truncate text-[11px] leading-tight opacity-80">
              {/* Thiếu phòng ban (chưa tải xong, chưa gắn hồ sơ, hoặc lỗi
                  khác) thì KHÔNG hiện dấu chấm ngăn cách lửng lơ. */}
              {hoSo?.phongBan && (
                <>
                  <span data-testid="header-phong-ban">{hoSo.phongBan}</span>
                  {" · "}
                </>
              )}
              {ngayDayDu(homNayVN())}
            </div>
          </div>
          {currentTenant?.tenantName && (
            <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px]">
              {currentTenant.tenantName}
            </span>
          )}
        </div>
      </div>

      {/* pb chừa chỗ cho thanh tab dính đáy, cộng thêm nhịp thở. */}
      <div className="p-4 pb-[calc(var(--emp-tab-height)+24px)]">
        <Outlet />
      </div>

      <nav className="emp-tabs flex items-center justify-around">
        {TAB.map((t) => (
          <NavLink
            key={t.den}
            to={t.den}
            className="emp-tab flex flex-col items-center gap-0.5 px-3 py-2"
          >
            <span className="text-xl leading-none">{t.icon}</span>
            <span className="text-[10px] font-medium">{t.nhan}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
