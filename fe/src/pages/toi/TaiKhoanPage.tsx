import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag } from "antd";
import { useAuth } from "@/contexts/AuthContext";
import { coQuyenQuanTri } from "@/config/coQuyenQuanTri";
import {
  employeeDeviceService,
  EmployeeDevice,
} from "@/services/employeeDeviceService";
import { useHoSoChamCong } from "@/contexts/HoSoChamCongContext";

const NHAN_TRANG_THAI: Record<string, { nhan: string; mau: string }> = {
  cho_duyet: { nhan: "Chờ duyệt", mau: "gold" },
  da_duyet: { nhan: "Đã duyệt", mau: "green" },
  tu_choi: { nhan: "Bị từ chối", mau: "red" },
  thu_hoi: { nhan: "Đã thu hồi", mau: "red" },
};

function chuDau(ten?: string): string {
  const sach = (ten ?? "").trim();
  if (!sach) return "?";
  const tu = sach.split(/\s+/);
  return tu[tu.length - 1].charAt(0).toUpperCase();
}

export default function TaiKhoanPage() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  // Hồ sơ chấm công hôm nay giờ nạp MỘT LẦN ở cấp vỏ /toi
  // (HoSoChamCongProvider, xem EmployeeLayout.tsx) và chia sẻ cho cả header
  // lẫn màn hình này — bỏ lời gọi /hom-nay riêng của trang này (Task 7).
  const { hoSo: homNay, chuaLienKet, dangTai } = useHoSoChamCong();
  // Rớt mạng, 500, hay token hết hạn KHÔNG phải là "chưa gắn hồ sơ" — chỉ
  // 404 (chuaLienKet) mới có nghĩa đó. Suy lại đúng 3 nhánh cũ (đang tải /
  // chưa liên kết / lỗi khác) từ 3 cờ mà context phơi ra, không tự thêm
  // state lặp lại thứ context đã quản lý.
  const loiTaiThongTin = !dangTai && !homNay && !chuaLienKet;
  const [thietBi, setThietBi] = useState<EmployeeDevice[]>([]);
  const [loiTaiThietBi, setLoiTaiThietBi] = useState(false);

  useEffect(() => {
    employeeDeviceService
      .cuaToi()
      .then(setThietBi)
      .catch((err) => {
        // Không tải được KHÔNG đồng nghĩa với "không có thiết bị nào" — một
        // nhân viên có máy đã được duyệt mà thấy dòng này sẽ tưởng máy mình
        // bị gỡ.
        console.error("Tải thiết bị của tôi lỗi:", err);
        setLoiTaiThietBi(true);
      });
  }, []);

  /**
   * Đăng xuất ở vỏ nhân viên.
   *
   * CỐ Ý không gọi `identityLogout()` ở đây: `AuthContext.logout` ĐÃ POST
   * `/api/logout` sang identity rồi (xem service đó) — gọi thêm ở đây là bắn
   * hai lượt cho cùng một cú bấm, không đóng thêm được gì.
   *
   * Truyền `/toi/login` để hạ cánh thẳng ở cổng chấm công. Mặc định của
   * `logout()` là về Portal masterceo.com.vn — đúng cho khu quản trị, nhưng
   * với nhân viên thì đó lại là chặng đường vòng qua Portal mà cả đợt này sinh
   * ra để xoá.
   */
  const dangXuat = () => {
    logout('/toi/login');
  };

  const hoTen = homNay?.nhanVien.hoTen ?? user?.hoTen ?? "";
  const quanTri = Boolean(user?.isSuperAdmin) || coQuyenQuanTri(hasPermission);

  const dong = (nhan: string, icon: string, onClick: () => void, nguyHiem = false) => (
    <button
      key={nhan}
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between border-b border-[color:var(--emp-border)] px-5 py-4 text-left last:border-b-0"
    >
      <span className="flex items-center gap-3">
        <span>{icon}</span>
        <span style={nguyHiem ? { color: "var(--emp-danger)" } : undefined}>{nhan}</span>
      </span>
      <span className="text-[color:var(--emp-muted)]">›</span>
    </button>
  );

  return (
    <div className="w-full">
      <div className="emp-card mb-4 p-6 text-center">
        <div
          className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-semibold text-white"
          style={{ background: "var(--emp-accent)" }}
        >
          {chuDau(hoTen)}
        </div>
        <div className="text-lg font-semibold">{hoTen}</div>
        {chuaLienKet ? (
          <div className="mt-2 text-[13px]" style={{ color: "var(--emp-danger)" }}>
            Tài khoản chưa được gắn với hồ sơ nhân viên. Liên hệ HR để được gán.
          </div>
        ) : loiTaiThongTin ? (
          <div className="mt-2 text-[13px]" style={{ color: "var(--emp-danger)" }}>
            Không tải được thông tin nhân viên. Thử tải lại trang.
          </div>
        ) : (
          <div className="mt-1 text-[13px] text-[color:var(--emp-text-phu)]">
            {[homNay?.phongBan, homNay?.nhanVien.employeeCode]
              .filter(Boolean)
              .join(" · ")}
          </div>
        )}
      </div>

      <div className="emp-card mb-4">
        <div className="border-b border-[color:var(--emp-border)] px-5 py-3 text-[13px] font-semibold text-[color:var(--emp-text-phu)]">
          📱 Thiết bị của tôi
        </div>
        {loiTaiThietBi ? (
          <div className="px-5 py-4 text-[13px]" style={{ color: "var(--emp-danger)" }}>
            Không tải được danh sách thiết bị. Thử tải lại trang.
          </div>
        ) : thietBi.length === 0 ? (
          <div className="px-5 py-4 text-[13px] text-[color:var(--emp-muted)]">
            Chưa có thiết bị nào được đăng ký.
          </div>
        ) : (
          thietBi.map((t) => {
            const tt = NHAN_TRANG_THAI[t.trangThai] ?? { nhan: t.trangThai, mau: "default" };
            return (
              <div
                key={t.id}
                className="flex items-center justify-between border-b border-[color:var(--emp-border)] px-5 py-3 last:border-b-0"
              >
                <span className="text-sm">{t.tenThietBi || "Thiết bị không tên"}</span>
                <Tag color={tt.mau}>{tt.nhan}</Tag>
              </div>
            );
          })
        )}
      </div>

      <div className="emp-card">
        {dong("Thông tin cá nhân", "👤", () => navigate("/profile"))}
        {/* HR mở app trên điện thoại phải có lối về khu quản trị — không có
            mục này họ chỉ thoát được /toi bằng cách gõ tay URL. Dùng chung
            phép kiểm với TrangChuTheoQuyen để hai chỗ không lệch nhau. */}
        {quanTri && dong("Khu quản trị", "🗂", () => navigate("/cau-hinh/vai-tro"))}
        {dong("Đăng xuất", "🚪", dangXuat, true)}
      </div>
    </div>
  );
}
