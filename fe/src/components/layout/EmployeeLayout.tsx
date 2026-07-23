import { NavLink, Outlet } from 'react-router-dom';
import {
  ClockCircleOutlined,
  FileTextOutlined,
  TableOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { homNayVN } from '@/ultils/thoiGianVN';
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
 * Header CỐ Ý không gọi API: mọi thứ nó cần đã có trong AuthContext. Gọi
 * /hom-nay ở đây sẽ thành cú gọi thứ hai trùng với cú gọi của màn chấm
 * công, chỉ để lấy tên phòng ban — phòng ban hiện ở tab Tài khoản.
 */
export default function EmployeeLayout() {
  const { user, currentTenant } = useAuth();

  return (
    <div className="emp-shell mx-auto w-full max-w-[480px]">
      <div className="emp-header sticky top-0 z-10 px-5 pb-4 pt-5">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 text-[15px] font-semibold">
              {chuDau(user?.hoTen)}
            </div>
            <div className="text-base font-semibold">{user?.hoTen}</div>
          </div>
          {currentTenant?.tenantName && (
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px]">
              {currentTenant.tenantName}
            </span>
          )}
        </div>
        <div className="text-[13px] opacity-85">{ngayDayDu(homNayVN())}</div>
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
