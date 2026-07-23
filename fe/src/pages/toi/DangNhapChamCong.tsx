import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Spin } from 'antd';
import { diToi } from '@/ultils/dieuHuong';
import {
  identityLogin,
  identityTenants,
  refreshFromIdentity,
  TenantChamCong,
} from '@/services/identitySession';
import { setAuthToken } from '@/services/base/service-base';
import { chonCongTy, docCongTyDaNho, ghiCongTyDaNho } from './chonCongTy';
import '@/components/layout/employee-shell.css';

type Man = 'dang_thu_phien' | 'nhap_mat_khau' | 'chon_cong_ty' | 'dang_vao';

const CAU_LOI = {
  sai_thong_tin: 'Email hoặc mật khẩu không đúng.',
  loi_mang: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.',
  khong_co_cong_ty:
    'Tài khoản chưa được cấp quyền dùng ứng dụng Nhân sự. Liên hệ HR.',
  khong_mo_duoc_phien: 'Không mở được phiên làm việc. Thử lại.',
} as const;

/**
 * Cổng đăng nhập riêng cho chấm công.
 *
 * Bước đầu tiên CỐ Ý không phải hiện ô mật khẩu, mà là thử đọc danh sách công
 * ty bằng cookie sẵn có. Cookie `mc_session` là refresh token dài hạn, còn
 * access token chỉ sống 15 phút — hỏi mật khẩu ngay sẽ khiến người dùng phải
 * gõ lại mỗi lần mở app dù phiên vẫn còn, trong khi Portal thì không hỏi.
 * Đây là thứ biến "cổng đăng nhập" thành "ứng dụng".
 *
 * CỐ Ý không có chức năng quên/đổi mật khẩu, và không cả dòng chữ chỉ đường —
 * quyết định đã chốt để giữ cổng này mỏng nhất có thể. Đừng "bổ sung cho đủ".
 */
export default function DangNhapChamCong() {
  const [man, setMan] = useState<Man>('dang_thu_phien');
  const [loi, setLoi] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [danhSach, setDanhSach] = useState<TenantChamCong[]>([]);

  /** Có tenantId rồi thì đổi lấy access token và vào. */
  const vaoVoiCongTy = useCallback(async (tenantId: string) => {
    setMan('dang_vao');
    const token = await refreshFromIdentity(tenantId);
    if (!token) {
      setLoi(CAU_LOI.khong_mo_duoc_phien);
      setMan('nhap_mat_khau');
      return;
    }
    setAuthToken(token);
    ghiCongTyDaNho(tenantId);
    // Tải lại cả trang thay vì navigate: AuthContext.initAuth chỉ chạy lúc
    // mount, và refreshUser() không set currentTenant lẫn nạp lĩnh vực. Đi
    // bằng router sẽ để isAuthenticated = false và bị guard đá ngược lại đây.
    diToi('/toi/cham-cong');
  }, []);

  /** Có phiên rồi thì đi tiếp; chưa có thì hiện ô mật khẩu. */
  const diTiepVoiPhien = useCallback(async () => {
    const ds = await identityTenants();
    if (ds === null) {
      setMan('nhap_mat_khau');
      return;
    }
    const kq = chonCongTy(ds, docCongTyDaNho());
    if (kq.loai === 'khong_co') {
      setLoi(CAU_LOI.khong_co_cong_ty);
      setMan('chon_cong_ty');
      setDanhSach([]);
      return;
    }
    if (kq.loai === 'phai_hoi') {
      setDanhSach(kq.danhSach);
      setMan('chon_cong_ty');
      return;
    }
    await vaoVoiCongTy(kq.tenantId);
  }, [vaoVoiCongTy]);

  useEffect(() => {
    void diTiepVoiPhien();
  }, [diTiepVoiPhien]);

  const guiDangNhap = async (v: { email: string; matKhau: string }) => {
    setDangGui(true);
    setLoi('');
    const kq = await identityLogin(v.email, v.matKhau);
    setDangGui(false);
    if (kq !== 'ok') {
      setLoi(CAU_LOI[kq]);
      return;
    }
    await diTiepVoiPhien();
  };

  const khung = (noiDung: React.ReactNode) => (
    <div className="emp-shell flex min-h-screen items-center justify-center px-5">
      <div className="emp-card w-full max-w-[400px] p-6">{noiDung}</div>
    </div>
  );

  if (man === 'dang_thu_phien' || man === 'dang_vao') {
    return khung(
      <div className="flex justify-center py-6">
        <Spin size="large" />
      </div>
    );
  }

  if (man === 'chon_cong_ty') {
    return khung(
      <>
        <div className="mb-4 text-lg font-semibold">Chọn công ty</div>
        {loi && <Alert type="error" showIcon message={loi} className="mb-3" />}
        {danhSach.map((t) => (
          <Button
            key={t.tenantId}
            block
            size="large"
            className="mb-2"
            onClick={() => void vaoVoiCongTy(t.tenantId)}
          >
            {t.tenantName}
          </Button>
        ))}
      </>
    );
  }

  return khung(
    <>
      <div className="mb-4 text-center text-lg font-semibold">Chấm công</div>
      {loi && <Alert type="error" showIcon message={loi} className="mb-3" />}
      <Form layout="vertical" onFinish={guiDangNhap}>
        <Form.Item
          label="Email"
          name="email"
          rules={[{ required: true, message: 'Nhập email' }]}
        >
          <Input size="large" autoComplete="username" inputMode="email" />
        </Form.Item>
        <Form.Item
          label="Mật khẩu"
          name="matKhau"
          rules={[{ required: true, message: 'Nhập mật khẩu' }]}
        >
          <Input.Password size="large" autoComplete="current-password" />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={dangGui}
          style={{ height: 48, backgroundColor: '#1f7769', borderColor: '#1f7769' }}
        >
          Đăng nhập
        </Button>
      </Form>
    </>
  );
}
