import {
  buildHopDongPlaceholders,
  renderHopDongHtml,
  sanitizeMauInHtml,
  DEFAULT_HOP_DONG_HTML,
  type HopDongRenderInput,
} from './hopDongRender';

/**
 * Dữ liệu mẫu đầy đủ — dùng làm baseline, từng test chỉ chỉnh phần cần thiết
 * (giữ test dễ đọc, khỏi lặp lại toàn bộ object mỗi lần).
 */
function fullInput(overrides?: Partial<HopDongRenderInput>): HopDongRenderInput {
  return {
    contract: {
      contractNo: 'HD0001',
      loaiHopDong: 'xac_dinh_thoi_han',
      ngayBatDau: '2026-08-01',
      ngayKetThuc: '2027-08-01',
      mucLuong: 5500000,
      phuCap: 0,
      createdAt: '2026-07-28T00:00:00.000Z',
    },
    employee: {
      hoTen: 'Nguyễn Văn A',
      ngaySinh: '1998-05-20',
      gioiTinh: 'nam',
      cccd: '001098012345',
      diaChi: '12 Láng Hạ, Đống Đa, Hà Nội',
      soDienThoai: '0912345678',
      chucDanh: 'Trợ lý',
    },
    congTy: {
      tenCongTy: 'CÔNG TY CỔ PHẦN MASTER CEO',
      diaChiCongTy: 'Số nhà A12TT17 khu đô thị Văn Quán, Hà Đông, Hà Nội',
      maSoThue: '0110595215',
      nguoiDaiDien: 'Nguyễn Thị Mai Phương',
      chucVuNguoiDaiDien: 'Giám đốc',
    },
    ...overrides,
  };
}

describe('sanitizeMauInHtml — chặn script trong mẫu in do tenant tự soạn', () => {
  it('cắt bỏ toàn bộ thẻ <script>...</script>', () => {
    const out = sanitizeMauInHtml('<div>Xin chào</div><script>alert(1)</script>');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('alert(1)');
    expect(out).toContain('<div>Xin chào</div>');
  });

  it('cắt bỏ thuộc tính on* (onerror, onclick, ...)', () => {
    const out = sanitizeMauInHtml('<img src="x" onerror="alert(1)" />');
    expect(out).not.toMatch(/onerror/i);
  });

  it('vô hiệu hoá javascript: trong href/src', () => {
    const out = sanitizeMauInHtml('<a href="javascript:alert(1)">bấm</a>');
    expect(out).not.toMatch(/javascript:/i);
  });

  it('giữ nguyên HTML định dạng bình thường (bảng, style, in đậm)', () => {
    const html = '<style>.x{color:red}</style><table><tr><td><b>Số</b>: {{soHopDong}}</td></tr></table>';
    expect(sanitizeMauInHtml(html)).toBe(html);
  });
});

describe('buildHopDongPlaceholders', () => {
  it('escape HTML trong giá trị nhân viên nhập (chống XSS qua dữ liệu, không qua template)', () => {
    const input = fullInput({
      employee: {
        ...fullInput().employee,
        hoTen: '<script>alert(1)</script>',
      },
    });
    const values = buildHopDongPlaceholders(input);
    expect(values.hoTenNLD).not.toContain('<script>');
    expect(values.hoTenNLD).toContain('&lt;script&gt;');
  });

  it('map giới tính nam/nu/khac sang nhãn tiếng Việt', () => {
    expect(buildHopDongPlaceholders(fullInput()).gioiTinh).toBe('Nam');
    expect(
      buildHopDongPlaceholders(fullInput({ employee: { ...fullInput().employee, gioiTinh: 'nu' } }))
        .gioiTinh,
    ).toBe('Nữ');
  });

  it('định dạng ngày sinh dd/mm/yyyy từ chuỗi ISO', () => {
    expect(buildHopDongPlaceholders(fullInput()).ngaySinh).toBe('20/05/1998');
  });

  it('định dạng mức lương kèm đơn vị đồng/tháng, có dấu phân cách nghìn', () => {
    expect(buildHopDongPlaceholders(fullInput()).mucLuong).toBe('5.500.000 đồng/tháng');
  });

  it('phụ cấp = 0 (chưa khai) → dùng câu mặc định "Theo quy định của công ty"', () => {
    expect(buildHopDongPlaceholders(fullInput()).phuCapText).toBe('Theo quy định của công ty');
  });

  it('phụ cấp > 0 → in số tiền thật thay vì câu mặc định', () => {
    const values = buildHopDongPlaceholders(fullInput({ contract: { ...fullInput().contract, phuCap: 500000 } }));
    expect(values.phuCapText).toBe('500.000 đồng/tháng');
  });

  describe('Điều 1.1 / 1.2 — loại hợp đồng và thời hạn phải khớp dữ liệu thật', () => {
    it('xac_dinh_thoi_han: 1.1 ghi "Xác định thời hạn", 1.2 nêu đủ ngày bắt đầu/kết thúc', () => {
      const values = buildHopDongPlaceholders(fullInput());
      expect(values.dieu1_1).toBe('Xác định thời hạn');
      expect(values.dieu1_2).toContain('01/08/2026');
      expect(values.dieu1_2).toContain('01/08/2027');
    });

    it('khong_xac_dinh_thoi_han: KHÔNG được bịa ngày kết thúc (hợp đồng này không có)', () => {
      const values = buildHopDongPlaceholders(
        fullInput({
          contract: {
            ...fullInput().contract,
            loaiHopDong: 'khong_xac_dinh_thoi_han',
            ngayKetThuc: undefined,
          },
        }),
      );
      expect(values.dieu1_1).toBe('Không xác định thời hạn');
      expect(values.dieu1_2).not.toContain('đến ngày');
      expect(values.dieu1_2).toContain('01/08/2026');
    });

    it('thu_viec: 1.1 ghi "Thử việc"', () => {
      const values = buildHopDongPlaceholders(
        fullInput({ contract: { ...fullInput().contract, loaiHopDong: 'thu_viec' } }),
      );
      expect(values.dieu1_1).toBe('Thử việc');
    });
  });

  it('thiếu dữ liệu công ty (chưa cấu hình) → placeholder rỗng, KHÔNG bịa "……" giả', () => {
    const values = buildHopDongPlaceholders(fullInput({ congTy: {} }));
    expect(values.tenCongTy).toBe('');
    expect(values.maSoThueCongTy).toBe('');
  });
});

describe('renderHopDongHtml', () => {
  it('thay token {{...}} bằng giá trị thật', () => {
    const { html } = renderHopDongHtml('<p>{{hoTenNLD}} - {{soHopDong}}</p>', fullInput());
    expect(html).toBe('<p>Nguyễn Văn A - HD0001</p>');
  });

  it('token không xác định → thay bằng chuỗi rỗng, không giữ nguyên {{...}}', () => {
    const { html } = renderHopDongHtml('<p>{{khongTonTai}}</p>', fullInput());
    expect(html).toBe('<p></p>');
  });

  it('liệt kê cảnh báo khi thiếu dữ liệu công ty', () => {
    const { canhBao } = renderHopDongHtml(DEFAULT_HOP_DONG_HTML, fullInput({ congTy: {} }));
    expect(canhBao.some((c) => c.toLowerCase().includes('công ty'))).toBe(true);
  });

  it('luôn cảnh báo thiếu ngày cấp/nơi cấp CCCD — trường này chưa có trong hồ sơ nhân viên', () => {
    const { canhBao } = renderHopDongHtml(DEFAULT_HOP_DONG_HTML, fullInput());
    expect(canhBao.some((c) => c.includes('CCCD'))).toBe(true);
  });

  it('mẫu mặc định giữ nguyên toàn bộ 9 Điều của văn bản gốc', () => {
    const { html } = renderHopDongHtml(DEFAULT_HOP_DONG_HTML, fullInput());
    for (let i = 1; i <= 9; i++) {
      expect(html).toContain(`Điều ${i}.`);
    }
    expect(html).toContain('Bộ luật Lao động số 45/2019/QH14');
  });

  it('script chèn qua giá trị nhân viên (không phải template) không lọt ra HTML sống', () => {
    const { html } = renderHopDongHtml(
      '<p>{{hoTenNLD}}</p>',
      fullInput({ employee: { ...fullInput().employee, hoTen: '<img src=x onerror=alert(1)>' } }),
    );
    expect(html).not.toContain('<img');
  });
});
