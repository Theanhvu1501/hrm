import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Spin } from 'antd';
import { diToi } from '@/ultils/dieuHuong';
import {
  identityLogin,
  identityLogout,
  identityTenants,
  refreshFromIdentity,
  TenantChamCong,
} from '@/services/identitySession';
import {
  setAuthToken,
  clearAuthToken,
  clearCurrentTenant,
} from '@/services/base/service-base';
import { chonCongTy, docCongTyDaNho, ghiCongTyDaNho } from './chonCongTy';
import '@/components/layout/employee-shell.css';

type Man =
  | 'dang_thu_phien'
  | 'nhap_mat_khau'
  | 'chon_cong_ty'
  | 'dang_vao'
  | 'loi_vao';

const CAU_LOI = {
  sai_thong_tin: 'Email hoặc mật khẩu không đúng.',
  loi_mang: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.',
  khong_co_cong_ty:
    'Tài khoản chưa được cấp quyền dùng ứng dụng Nhân sự. Liên hệ HR.',
  khong_mo_duoc_phien: 'Không mở được phiên làm việc. Thử lại.',
  khong_vao_duoc: 'Không vào được màn chấm công. Thử lại.',
} as const;

/** Màu nhấn chung cho các nút hành động chính của cổng này (nút Đăng nhập và
 * các nút chọn công ty) — để hai màn hình trông cùng một hệ thống. */
const KIEU_NUT_NHAN: React.CSSProperties = {
  backgroundColor: '#1f7769',
  borderColor: '#1f7769',
};

/**
 * Cầu chì chống vòng lặp reload vô hạn. `diToi()` là
 * full page reload; nếu sau khi reload backend hrm lỗi, guard sẽ đá người
 * dùng ngược lại đúng màn này, phiên identity vẫn sống nên màn lại tự động
 * điều hướng tiếp — lặp vô hạn. Cờ này giới hạn "tự động điều hướng" còn
 * đúng 1 lần cho mỗi lần mở tab. Dùng sessionStorage (không phải
 * localStorage) để cờ tự rơi khi người dùng mở tab mới, không sống mãi.
 */
const KHOA_DA_THU_VAO = 'cham_cong_da_thu_vao';

function daThuVaoRoi(): boolean {
  try {
    return sessionStorage.getItem(KHOA_DA_THU_VAO) === '1';
  } catch {
    // Trình duyệt riêng tư / chặn sessionStorage: coi như chưa thử — thà để
    // lọt một vòng lặp hiếm gặp còn hơn chặn oan người dùng bình thường.
    return false;
  }
}

function danhDauDaThuVao(): void {
  try {
    sessionStorage.setItem(KHOA_DA_THU_VAO, '1');
  } catch {
    /* bỏ qua — xem chú thích ở daThuVaoRoi */
  }
}

function xoaDaThuVao(): void {
  try {
    sessionStorage.removeItem(KHOA_DA_THU_VAO);
  } catch {
    /* bỏ qua */
  }
}

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

  /**
   * Có tenantId rồi thì đổi lấy access token và vào.
   *
   * `tuDong` phân biệt NGUỒN của lệnh gọi này, không phải kết quả của nó:
   * - `true`  — CHỈ nhánh do effect lúc mount kích hoạt (dò phiên sẵn có rồi
   *   tự vào thẳng, người dùng chưa bấm gì cả). Cầu chì chống-vòng-lặp chỉ áp
   *   cho nhánh này, vì chỉ nhánh này mới có thể tự lặp lại vô hạn khi remount.
   * - `false` — mọi hành động CHỦ ĐỘNG của người dùng (gửi form mật khẩu,
   *   bấm chọn công ty, bấm "Thử lại"). Một cú bấm, theo định nghĩa, không
   *   phải là vòng lặp tự động — luôn điều hướng, không tra cầu chì, và xoá
   *   cờ cũ vì đây là bằng chứng người dùng vừa có hành động mới.
   */
  const vaoVoiCongTy = useCallback(async (tenantId: string, tuDong: boolean) => {
    setMan('dang_vao');
    const token = await refreshFromIdentity(tenantId);
    if (!token) {
      setLoi(CAU_LOI.khong_mo_duoc_phien);
      setMan('nhap_mat_khau');
      return;
    }
    setAuthToken(token);
    ghiCongTyDaNho(tenantId);
    if (tuDong) {
      if (daThuVaoRoi()) {
        // Đã từng gọi diToi ít nhất 1 lần TỰ ĐỘNG trong tab này mà vẫn quay
        // lại được tới đây — rất có thể backend hrm đang lỗi ngay sau reload.
        // Điều hướng tiếp sẽ thành vòng lặp reload vô hạn; dừng lại và để
        // người dùng chủ động bấm thử lại thay vì màn hình tự đá qua đá lại.
        setLoi(CAU_LOI.khong_vao_duoc);
        setMan('loi_vao');
        return;
      }
      danhDauDaThuVao();
    } else {
      xoaDaThuVao();
    }
    // Tải lại cả trang thay vì navigate: AuthContext.initAuth chỉ chạy lúc
    // mount, và refreshUser() không set currentTenant lẫn nạp lĩnh vực. Đi
    // bằng router sẽ để isAuthenticated = false và bị guard đá ngược lại đây.
    //
    // `?tenant=` KHÔNG phải trang trí: sau khi tải lại, `initAuth` chốt công ty
    // theo thứ tự `handoffTenant ?? currentTenant ?? tenant trong token`. Một
    // `currentTenant` cũ còn sót trong localStorage (từ phiên Portal hoặc phiên
    // quản trị trước đó) sẽ ĐÈ lên công ty vừa chọn ở đây — nhân viên bấm Công
    // ty B mà bị đặt vào Công ty A và chấm công nhầm công ty, ngày nào cũng lặp
    // vì lựa chọn còn được ghi nhớ. Đây đúng là kênh mà handoff SSO từ Portal
    // vẫn dùng để báo ý định, và `initAuth` đã xếp nó lên đầu.
    diToi(`/toi/cham-cong?tenant=${encodeURIComponent(tenantId)}`);
  }, []);

  /**
   * Có phiên rồi thì đi tiếp; chưa có thì hiện ô mật khẩu. `tuDong` được
   * truyền thẳng xuống `vaoVoiCongTy` khi chonCongTy tự chọn được công ty
   * duy nhất/đã nhớ — xem chú thích ở đó.
   */
  const diTiepVoiPhien = useCallback(async (tuDong: boolean) => {
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
    await vaoVoiCongTy(kq.tenantId, tuDong);
  }, [vaoVoiCongTy]);

  useEffect(() => {
    // Duy nhất nhánh tự động: effect lúc mount, dò phiên sẵn có.
    void diTiepVoiPhien(true);
  }, [diTiepVoiPhien]);

  /** Khi cầu chì ở trên chặn (man === 'loi_vao') thì đây là lối thoát: xoá cờ
   * rồi chạy lại đúng luồng thử phiên như lúc mount, để người dùng chủ động
   * thử lại thay vì bị kẹt vĩnh viễn ở màn báo lỗi. */
  const thuLaiSauLoiVao = useCallback(() => {
    xoaDaThuVao();
    setLoi('');
    setMan('dang_thu_phien');
    // Hành động chủ động (bấm nút), không phải nhánh tự động lúc mount.
    void diTiepVoiPhien(false);
  }, [diTiepVoiPhien]);

  /**
   * Đây là ĐĂNG XUẤT, không phải một tính năng mật khẩu — lối thoát duy nhất
   * khi tài khoản đang đăng nhập (trên thiết bị mượn, chẳng hạn) không được
   * cấp công ty nào. Không có nó, reload cũng vô ích vì phiên identity vẫn
   * sống và lại đưa thẳng về đúng màn báo lỗi này.
   */
  const dangXuatVaVeMatKhau = useCallback(async () => {
    await identityLogout();
    // Đóng phiên identity thôi CHƯA đủ. hrm tự kiểm access token bằng HS256 và
    // không bao giờ hỏi lại identity, nên token cũ nằm trong localStorage vẫn
    // dùng được đến hết 15 phút đời của nó: chỉ cần gõ /toi/cham-cong là thấy
    // dữ liệu của người vừa đăng xuất. Nút này tồn tại ĐÚNG cho tình huống máy
    // mượn, nên đây là chỗ không được phép rò.
    clearAuthToken();
    clearCurrentTenant();
    setLoi('');
    setMan('nhap_mat_khau');
  }, []);

  const guiDangNhap = async (v: { email: string; matKhau: string }) => {
    setDangGui(true);
    setLoi('');
    try {
      const kq = await identityLogin(v.email, v.matKhau);
      if (kq !== 'ok') {
        setLoi(CAU_LOI[kq]);
        return;
      }
      // Hành động chủ động (gửi form), không phải nhánh tự động lúc mount.
      await diTiepVoiPhien(false);
    } finally {
      // finally (không phải ngay sau identityLogin): nếu tắt loading trước
      // khi diTiepVoiPhien/vaoVoiCongTy chạy xong thì form vẫn bấm được
      // trong lúc chờ, mở cửa sổ double-submit gửi 2 lượt đăng nhập.
      setDangGui(false);
    }
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
        {/* Chỉ hiện tiêu đề "Chọn công ty" khi thật sự có danh sách để chọn —
            danh sách rỗng thì đây không phải màn chọn gì cả, mà là ngõ cụt
            cần lối thoát (xem nút đăng xuất bên dưới). */}
        {danhSach.length > 0 && (
          <div className="mb-4 text-lg font-semibold">Chọn công ty</div>
        )}
        {loi && <Alert type="error" showIcon message={loi} className="mb-3" />}
        {danhSach.map((t) => (
          <Button
            key={t.tenantId}
            type="primary"
            block
            size="large"
            className="mb-2"
            style={KIEU_NUT_NHAN}
            // Hành động chủ động (bấm chọn công ty), không phải tự động.
            onClick={() => void vaoVoiCongTy(t.tenantId, false)}
          >
            {t.tenantName}
          </Button>
        ))}
        {danhSach.length === 0 && (
          // Phiên identity vẫn sống nên reload trang cũng chỉ quay lại đúng
          // đây — nếu tài khoản đang đăng nhập không có công ty nào, đây là
          // đăng xuất chứ không phải tính năng mật khẩu.
          <Button block size="large" onClick={() => void dangXuatVaVeMatKhau()}>
            Đăng nhập tài khoản khác
          </Button>
        )}
      </>
    );
  }

  if (man === 'loi_vao') {
    return khung(
      <>
        <div className="mb-4 text-center text-lg font-semibold">Chấm công</div>
        <Alert type="error" showIcon message={loi} className="mb-3" />
        <Button block size="large" style={KIEU_NUT_NHAN} type="primary" onClick={thuLaiSauLoiVao}>
          Thử lại
        </Button>
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
          style={{ height: 48, ...KIEU_NUT_NHAN }}
        >
          Đăng nhập
        </Button>
      </Form>
    </>
  );
}
