import { dungDongThayDoi, renderPhuLucHtml } from './phuLucRender';

const CONG_TY = {
  tenCongTy: 'CÔNG TY TNHH ABC',
  diaChiCongTy: 'Số 1 Đường A',
  maSoThue: '0100000000',
  nguoiDaiDien: 'Ông Nguyễn Văn A',
  chucVuNguoiDaiDien: 'Giám đốc',
  thanhPhoKy: 'Hà Nội',
};

const NHAN_VIEN = {
  hoTen: 'Trần Thị B',
  ngaySinh: '1995-05-20',
  cccd: '001195000111',
  diaChi: 'Hà Nội',
};

describe('dungDongThayDoi', () => {
  it('chỉ liệt kê chỉ tiêu THỰC SỰ đổi', () => {
    const dong = dungDongThayDoi({
      congTy: CONG_TY,
      nhanVien: NHAN_VIEN,
      thayDoi: {
        // Phòng ban không đổi — không được xuất hiện trong phụ lục.
        phongBanCu: 'Kinh doanh',
        phongBanMoi: 'Kinh doanh',
        chucDanhCu: 'Nhân viên',
        chucDanhMoi: 'Trưởng nhóm',
        mucLuongCu: 10_000_000,
        mucLuongMoi: 15_000_000,
      },
    });

    expect(dong.map((d) => d.chiTieu)).toStrictEqual(['Chức danh', 'Mức lương']);
    expect(dong[1]).toStrictEqual({
      chiTieu: 'Mức lương',
      cu: '10.000.000 đồng',
      moi: '15.000.000 đồng',
    });
  });

  it('phụ cấp mới in theo TÊN khoản, không in mã', () => {
    const dong = dungDongThayDoi({
      congTy: CONG_TY,
      nhanVien: NHAN_VIEN,
      tenKhoan: { PC_CHUC_VU: 'Phụ cấp chức vụ' },
      thayDoi: {
        phuCapCu: { PC_CHUC_VU: 1_000_000 },
        phuCapMoi: { PC_CHUC_VU: 2_000_000 },
      },
    });

    expect(dong).toStrictEqual([
      {
        chiTieu: 'Phụ cấp chức vụ',
        cu: '1.000.000 đồng',
        moi: '2.000.000 đồng',
      },
    ]);
  });

  it('khoản trước đây "theo công ty" (vắng khoá) vẫn là một thay đổi', () => {
    const dong = dungDongThayDoi({
      congTy: CONG_TY,
      nhanVien: NHAN_VIEN,
      thayDoi: { phuCapCu: {}, phuCapMoi: { AN_CA: 60_000 } },
    });
    expect(dong[0].cu).toBe('Theo quy định công ty');
    expect(dong[0].moi).toBe('60.000 đồng');
  });

  it('khoản đặt lại ĐÚNG số cũ thì không in', () => {
    const dong = dungDongThayDoi({
      congTy: CONG_TY,
      nhanVien: NHAN_VIEN,
      thayDoi: { phuCapCu: { AN_CA: 50_000 }, phuCapMoi: { AN_CA: 50_000 } },
    });
    expect(dong).toStrictEqual([]);
  });

  it('lương mới bằng lương cũ thì không in dòng lương', () => {
    const dong = dungDongThayDoi({
      congTy: CONG_TY,
      nhanVien: NHAN_VIEN,
      thayDoi: { mucLuongCu: 10_000_000, mucLuongMoi: 10_000_000 },
    });
    expect(dong).toStrictEqual([]);
  });
});

describe('renderPhuLucHtml', () => {
  it('in đủ hai bên ký, ngày hiệu lực và bảng thay đổi', () => {
    const html = renderPhuLucHtml({
      congTy: CONG_TY,
      nhanVien: NHAN_VIEN,
      thayDoi: {
        soQuyetDinh: 'QĐ-12',
        ngayHieuLuc: '2026-09-01',
        loaiThayDoi: 'bo_nhiem',
        chucDanhCu: 'Nhân viên',
        chucDanhMoi: 'Trưởng nhóm',
      },
    });

    expect(html).toContain('PHỤ LỤC HỢP ĐỒNG LAO ĐỘNG');
    expect(html).toContain('Số: QĐ-12');
    expect(html).toContain('01/09/2026');
    expect(html).toContain('CÔNG TY TNHH ABC');
    expect(html).toContain('Trần Thị B');
    expect(html).toContain('Trưởng nhóm');
  });

  it('không có chỉ tiêu nào đổi thì nói thẳng, không in bảng rỗng', () => {
    const html = renderPhuLucHtml({
      congTy: CONG_TY,
      nhanVien: NHAN_VIEN,
      thayDoi: { ngayHieuLuc: '2026-09-01' },
    });
    expect(html).toContain('Không có chỉ tiêu nào thay đổi');
  });

  it('escape dữ liệu người dùng — tên có dấu ngoặc nhọn không thành thẻ', () => {
    const html = renderPhuLucHtml({
      congTy: CONG_TY,
      nhanVien: { hoTen: '<script>alert(1)</script>' },
      thayDoi: { ngayHieuLuc: '2026-09-01' },
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
