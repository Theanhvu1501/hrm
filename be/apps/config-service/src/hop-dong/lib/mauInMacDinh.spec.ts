import { MAU_IN_MAC_DINH } from './mauInMacDinh';
import {
  sanitizeHopDongHtml,
  timTokenLaCuaMauIn,
  renderHopDongHtml,
} from './hopDongRender';

/**
 * Bộ mẫu này do `ops/chuyen-mau-hop-dong.py` SINH RA từ file .docx của bên
 * pháp chế. Nó sẽ được sinh lại mỗi lần có bản .docx mới, nên các bài dưới
 * đây canh đúng những thứ mà một lần sinh lại có thể làm hỏng mà không ai
 * nhìn thấy:
 *   - token gõ sai / token script bịa ra → `lamSachHtmlMau` ném 400 và cả nút
 *     "Nạp mẫu mặc định" chết, nhưng chỉ khi có người bấm.
 *   - dữ liệu cá nhân của nhân viên cũ còn sót trong file mẫu → in ra hợp
 *     đồng của người khác mang tên người đó.
 *   - sanitizer nuốt mất nội dung vì script sinh thẻ không nằm trong allowlist.
 */
describe('MAU_IN_MAC_DINH', () => {
  it('có đủ 6 mẫu lấy từ docs/Mau_hop_dong', () => {
    expect(MAU_IN_MAC_DINH).toHaveLength(6);
    expect(MAU_IN_MAC_DINH.map((m) => m.ten)).toEqual([
      'Hợp đồng thử việc',
      'Hợp đồng lao động',
      'Hợp đồng thực tập sinh',
      'Cam kết bảo mật thông tin',
      'Hợp đồng dịch vụ (cộng tác viên, bếp, vệ sinh)',
      'Hợp đồng dịch vụ quản lý & phát triển hệ thống',
    ]);
  });

  it.each(MAU_IN_MAC_DINH.map((m) => [m.ten, m] as const))(
    '%s — chỉ dùng token hợp lệ',
    (_ten, mau) => {
      expect(timTokenLaCuaMauIn(mau.html)).toStrictEqual([]);
    },
  );

  it.each(MAU_IN_MAC_DINH.map((m) => [m.ten, m] as const))(
    '%s — qua sanitizer không mất nội dung',
    (_ten, mau) => {
      const sach = sanitizeHopDongHtml(mau.html);
      // Sanitizer bỏ thẻ ngoài allowlist là bỏ luôn nội dung bên trong
      // (disallowedTagsMode: 'discard'). Mất 5% là đã mất cả một Điều.
      expect(sach.length).toBeGreaterThan(mau.html.length * 0.95);
      // Token phải sống sót qua sanitizer, nếu không mẫu in ra rỗng chỗ tên
      // công ty. (`{{hoTenNLD}}` không kiểm ở đây: mẫu dịch vụ quản lý là hợp
      // đồng giữa HAI CÔNG TY, không có người lao động nào trong đó.)
      expect(sach).toContain('{{tenCongTy}}');
    },
  );

  /**
   * File .docx bên pháp chế gửi sang là BẢN ĐÃ KÝ của một nhân viên thật —
   * BM-07 còn nguyên họ tên, ngày sinh, số điện thoại, email và số tài khoản
   * của người đó. Sót lại là mọi hợp đồng in ra đều mang thông tin người này.
   */
  it.each(MAU_IN_MAC_DINH.map((m) => [m.ten, m] as const))(
    '%s — không còn dữ liệu cá nhân của người trong file mẫu',
    (_ten, mau) => {
      for (const xau of [
        'NGUYỄN THỊ PHƯƠNG THẢO',
        'ĐINH THỊ KIM OANH',
        'nguyenthao197',
        '0976190791',
        '6888888789',
        '23/06/1990',
      ]) {
        expect(mau.html).not.toContain(xau);
      }
    },
  );

  /**
   * Tên/địa chỉ/MST của MASTER CEO nằm cứng trong văn bản gốc. Nền tảng đa
   * tenant mà để nguyên thì công ty khác in ra hợp đồng mang tên MASTER CEO.
   *
   * Ngoại lệ: mẫu "dịch vụ quản lý & phát triển hệ thống" là hợp đồng B2B,
   * Bên A là đối tác (Vibiz Coach) — thông tin của HỌ cố ý giữ nguyên.
   */
  it.each(
    MAU_IN_MAC_DINH.filter((m) => !m.ten.includes('quản lý')).map(
      (m) => [m.ten, m] as const,
    ),
  )('%s — không còn thông tin công ty nằm cứng', (_ten, mau) => {
    expect(mau.html).not.toContain('MASTER CEO');
    expect(mau.html).not.toContain('A12TT17');
    expect(mau.html).not.toContain('0110595215');
  });

  it('render ra văn bản thật: token được thay, không còn dấu {{', () => {
    const mau = MAU_IN_MAC_DINH[0];
    const { html } = renderHopDongHtml(mau.html, {
      contract: {
        contractNo: 'HD0001',
        loaiHopDong: 'thu_viec',
        ngayBatDau: '2026-09-01',
        ngayKetThuc: '2026-11-01',
        mucLuong: 15_000_000,
        chucDanh: 'Nhân viên kinh doanh',
      },
      employee: {
        hoTen: 'Trần Thị B',
        ngaySinh: '1995-05-20',
        gioiTinh: 'nu',
        cccd: '001195000111',
        ngayCapCccd: '2021-08-28',
        noiCapCccd: 'Cục Cảnh sát QLHC về TTXH',
        diaChi: 'Hà Nội',
        soDienThoai: '0900000000',
        email: 'b@vd.vn',
        mst: '8000000001',
      },
      congTy: {
        tenCongTy: 'CÔNG TY TNHH ABC',
        diaChiCongTy: 'Số 1 Đường A',
        maSoThue: '0100000000',
        nguoiDaiDien: 'Ông Nguyễn Văn A',
        chucVuNguoiDaiDien: 'Giám đốc',
        thanhPhoKy: 'Hà Nội',
        maHopDongMau: '/HĐTV',
      },
    });

    expect(html).not.toMatch(/\{\{\s*\w+\s*\}\}/);
    expect(html).toContain('Trần Thị B');
    expect(html).toContain('CÔNG TY TNHH ABC');
    expect(html).toContain('01/09/2026');
    expect(html).toContain('15.000.000');
    // KHÔNG được in tên công ty mẫu của bên pháp chế.
    expect(html).not.toContain('MASTER CEO');
  });
});
