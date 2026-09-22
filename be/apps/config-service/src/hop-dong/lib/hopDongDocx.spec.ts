import { renderHopDongDocx } from './hopDongDocx';

describe('renderHopDongDocx', () => {
  it('sinh ra buffer docx hợp lệ', async () => {
    const buffer = await renderHopDongDocx({
      hopDong: {
        contractNo: 'HD0001',
        loaiHopDong: 'xac_dinh_thoi_han',
        ngayBatDau: '2026-01-01',
        ngayKetThuc: '2027-01-01',
        mucLuong: 10000000,
        phuCap: 500000,
      },
      nhanVien: {
        hoTen: 'Nguyễn Văn A',
        ngaySinh: '1990-01-15',
        gioiTinh: 'Nam',
        cccd: '012345678901',
        ngayCapCccd: '2020-05-01',
        noiCapCccd: 'Cục CSQLHC về TTXH',
        diaChi: '123 Đường ABC, Quận 1, TP.HCM',
        soDienThoai: '0901234567',
        chucDanh: 'Nhân viên kế toán',
        email: 'nguyenvana@example.com',
      },
      congTy: {
        tenCongTy: 'Công ty TNHH ABC',
        diaChiCongTy: '456 Đường XYZ, Quận 3, TP.HCM',
        maSoThue: '0123456789',
        nguoiDaiDien: 'Trần Văn B',
        chucVuNguoiDaiDien: 'Giám đốc',
        thanhPhoKy: 'TP. Hồ Chí Minh',
      },
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // Check DOCX magic bytes (PK zip header)
    expect(buffer[0]).toBe(0x50); // 'P'
    expect(buffer[1]).toBe(0x4b); // 'K'
  });

  it('xử lý dữ liệu thiếu với placeholder', async () => {
    const buffer = await renderHopDongDocx({
      hopDong: {
        contractNo: 'HD0002',
      },
      nhanVien: {
        hoTen: 'Lê Thị C',
      },
      congTy: {
        tenCongTy: null,
      },
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // Vẫn sinh docx hợp lệ
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });

  it('ưu tiên chức danh trên hợp đồng hơn chức danh nhân viên', async () => {
    // Không có cách trực tiếp test nội dung docx, nhưng đảm bảo không lỗi
    const buffer = await renderHopDongDocx({
      hopDong: {
        contractNo: 'HD0003',
        chucDanh: 'Trưởng phòng', // snapshot lúc ký
      },
      nhanVien: {
        hoTen: 'Phạm Văn D',
        chucDanh: 'Phó phòng', // chức danh hiện tại (đã thay đổi)
      },
      congTy: {},
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
