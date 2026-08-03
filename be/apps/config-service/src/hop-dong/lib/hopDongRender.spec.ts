import {
  buildHopDongPlaceholders,
  renderHopDongHtml,
  sanitizeHopDongHtml,
  timTokenLaCuaMauIn,
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
      thanhPhoKy: 'Hà Nội',
      maHopDongMau: '/HĐLĐ-MC.1',
    },
    ...overrides,
  };
}

/**
 * Payload thật do reviewer chạy tay qua bản regex CŨ (`sanitizeMauInHtml`) —
 * TOÀN BỘ 9 payload dưới đây SỐNG SÓT nguyên vẹn qua bản đó (script với
 * khoảng trắng/solidus trong end tag, script không đóng thẻ, "/" làm dấu
 * tách thuộc tính thay vì khoảng trắng, svg/iframe/base không nằm trong tầm
 * ngắm của regex, javascript: không có dấu nháy hoặc encode bằng entity).
 * Sau khi đổi sang `sanitize-html` (allowlist thẻ, KHÔNG allowlist bất kỳ
 * thẻ nào có thể mang href/src — a/img/iframe/svg/object/embed/form/base/
 * link/meta/script đều bị loại khỏi allowedTags), không còn "vá từng mẫu"
 * nữa: toàn bộ nhóm thẻ mang được URL/script đã biến mất khỏi allowlist,
 * nên các biến thể encode/malformed không có "chỗ bám".
 */
const XSS_PAYLOADS: Array<{ ten: string; payload: string }> = [
  { ten: 'script với khoảng trắng cuối end tag', payload: '<script>alert(1)</script >' },
  { ten: 'script với solidus trong end tag', payload: '<script>alert(1)</script/>' },
  { ten: 'script không đóng thẻ', payload: '<script>alert(1)' },
  { ten: 'onerror ngăn cách bằng "/" thay vì khoảng trắng', payload: '<img src=x/onerror=alert(1)>' },
  { ten: 'svg onload', payload: '<svg/onload=alert(1)>' },
  { ten: 'iframe srcdoc chứa script', payload: '<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"></iframe>' },
  { ten: 'href javascript: không có dấu nháy', payload: '<a href=javascript:alert(1)>bấm</a>' },
  { ten: 'href javascript: encode bằng HTML entity', payload: '<a href="javas&#99;ript:alert(1)">bấm</a>' },
  { ten: 'base href đổi gốc tương đối của cả trang', payload: '<base href="https://evil.example/">' },
];

describe('sanitizeHopDongHtml — payload XSS thật (reviewer xác nhận sống sót qua bản regex cũ)', () => {
  it.each(XSS_PAYLOADS)('$ten → không còn thực thi được (bị loại khỏi output)', ({ payload }) => {
    const out = sanitizeHopDongHtml(payload);
    expect(out.toLowerCase()).not.toContain('<script');
    expect(out.toLowerCase()).not.toContain('onerror');
    expect(out.toLowerCase()).not.toContain('onload');
    expect(out.toLowerCase()).not.toMatch(/javascript\s*:/);
    expect(out.toLowerCase()).not.toContain('<base');
    expect(out.toLowerCase()).not.toContain('<iframe');
    expect(out.toLowerCase()).not.toContain('<svg');
    expect(out.toLowerCase()).not.toContain('<a ');
    expect(out.toLowerCase()).not.toContain('<img');
  });

  it('cắt bỏ toàn bộ thẻ <script>...</script> kèm nội dung bên trong', () => {
    const out = sanitizeHopDongHtml('<div>Xin chào</div><script>alert(1)</script>');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('alert(1)');
    expect(out).toContain('Xin chào');
  });

  it('giữ nguyên nội dung định dạng bình thường (bảng, style, in đậm, token {{...}})', () => {
    const html =
      '<style>.x{color:red}</style><table><tr><td><b>Số</b>: {{soHopDong}}</td></tr></table>';
    const out = sanitizeHopDongHtml(html);
    expect(out).toContain('{{soHopDong}}');
    expect(out).toContain('<table>');
    expect(out).toContain('<b>Số</b>');
    expect(out).toContain('color:red');
  });

  it('không cho phép bất kỳ thẻ nào mang được href/src (a/img/iframe/object/embed/form/base/link) dù không có payload độc', () => {
    const out = sanitizeHopDongHtml(
      '<a href="/noi-bo">link</a><img src="/logo.png"><form action="/x"><input></form>',
    );
    expect(out).not.toContain('<a ');
    expect(out).not.toContain('<img');
    expect(out).not.toContain('<form');
    expect(out).not.toContain('<input');
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
    expect(values.thanhPhoKy).toBe('');
    expect(values.maHopDongMau).toBe('');
  });

  it('thanhPhoKy/maHopDongMau lấy từ cấu hình tenant, KHÔNG hard-code "Hà Nội"/"HĐLĐ-MC.1" (review Important #6)', () => {
    const values = buildHopDongPlaceholders(
      fullInput({
        congTy: { ...fullInput().congTy, thanhPhoKy: 'Đà Nẵng', maHopDongMau: '/HĐLĐ-DN.2' },
      }),
    );
    expect(values.thanhPhoKy).toBe('Đà Nẵng');
    expect(values.maHopDongMau).toBe('/HĐLĐ-DN.2');
  });

  describe('chucDanh — snapshot lúc ký ưu tiên hơn chức danh hiện tại (review Important #4)', () => {
    it('dùng contract.chucDanh khi hợp đồng đã có snapshot', () => {
      const values = buildHopDongPlaceholders(
        fullInput({
          contract: { ...fullInput().contract, chucDanh: 'Trưởng phòng (lúc ký)' },
          employee: { ...fullInput().employee, chucDanh: 'Giám đốc (hiện tại)' },
        }),
      );
      expect(values.chucDanh).toBe('Trưởng phòng (lúc ký)');
    });

    it('hợp đồng cũ chưa có snapshot → fallback về chức danh hiện tại của nhân viên', () => {
      const values = buildHopDongPlaceholders(
        fullInput({
          contract: { ...fullInput().contract, chucDanh: undefined },
          employee: { ...fullInput().employee, chucDanh: 'Giám đốc (hiện tại)' },
        }),
      );
      expect(values.chucDanh).toBe('Giám đốc (hiện tại)');
    });
  });
});

describe('timTokenLaCuaMauIn — validate token lúc lưu mẫu (review Important #7)', () => {
  it('không báo gì khi mẫu chỉ dùng token hợp lệ', () => {
    expect(timTokenLaCuaMauIn('<p>{{hoTenNLD}} - {{soHopDong}}</p>')).toEqual([]);
  });

  it('phát hiện lỗi gõ token (vd {{mucLuongg}}) thay vì âm thầm in trống', () => {
    expect(timTokenLaCuaMauIn('<p>Lương: {{mucLuongg}}</p>')).toEqual(['mucLuongg']);
  });

  it('gom đủ nhiều token lạ khác nhau, không trùng lặp', () => {
    expect(
      timTokenLaCuaMauIn('{{xxx}} {{yyy}} {{xxx}} {{soHopDong}}'),
    ).toEqual(['xxx', 'yyy']);
  });

  // Bảo vệ chống lệch giữa HOP_DONG_TOKENS và DEFAULT_HOP_DONG_HTML — nếu ai
  // đó thêm token mới vào mẫu mặc định mà quên khai vào HOP_DONG_TOKENS,
  // upsertMauIn() sẽ (sai) từ chối chính mẫu mặc định nếu tenant copy nó làm
  // điểm bắt đầu chỉnh sửa.
  it('mẫu mặc định KHÔNG dùng token nào ngoài HOP_DONG_TOKENS', () => {
    expect(timTokenLaCuaMauIn(DEFAULT_HOP_DONG_HTML)).toEqual([]);
  });
});

describe('renderHopDongHtml', () => {
  it('thay token {{...}} bằng giá trị thật', () => {
    const { html } = renderHopDongHtml('<p>{{hoTenNLD}} - {{soHopDong}}</p>', fullInput());
    expect(html).toBe('<p>Nguyễn Văn A - HD0001</p>');
  });

  it('token không xác định → GIỮ NGUYÊN {{...}} (báo lỗi hiện rõ, không âm thầm để trống — review Important #7)', () => {
    const { html } = renderHopDongHtml('<p>{{khongTonTai}}</p>', fullInput());
    expect(html).toBe('<p>{{khongTonTai}}</p>');
  });

  it('liệt kê cảnh báo khi thiếu dữ liệu công ty', () => {
    const { canhBao } = renderHopDongHtml(DEFAULT_HOP_DONG_HTML, fullInput({ congTy: {} }));
    expect(canhBao.some((c) => c.toLowerCase().includes('công ty'))).toBe(true);
  });

  it('cảnh báo thiếu ngày cấp/nơi cấp CCCD khi mẫu đang dùng còn nhắc tới CCCD (mẫu mặc định có)', () => {
    const { canhBao } = renderHopDongHtml(DEFAULT_HOP_DONG_HTML, fullInput());
    expect(canhBao.some((c) => c.includes('CCCD'))).toBe(true);
  });

  it('KHÔNG cảnh báo CCCD nếu mẫu riêng của tenant đã bỏ hẳn đoạn CCCD (review Minor)', () => {
    const { canhBao } = renderHopDongHtml('<p>{{hoTenNLD}}</p>', fullInput());
    expect(canhBao.some((c) => c.includes('CCCD'))).toBe(false);
  });

  it('cảnh báo khi hợp đồng chưa có mức lương (review Important #5)', () => {
    const { canhBao } = renderHopDongHtml(
      '<p>{{mucLuong}}</p>',
      fullInput({ contract: { ...fullInput().contract, mucLuong: undefined } }),
    );
    expect(canhBao.some((c) => c.includes('mức lương'))).toBe(true);
  });

  it('cảnh báo hợp đồng xác định thời hạn nhưng thiếu ngày kết thúc (review Important #5, BLLĐ Điều 20)', () => {
    const { canhBao } = renderHopDongHtml(
      '<p>x</p>',
      fullInput({
        contract: {
          ...fullInput().contract,
          loaiHopDong: 'xac_dinh_thoi_han',
          ngayKetThuc: undefined,
        },
      }),
    );
    expect(canhBao.some((c) => c.includes('Điều 20'))).toBe(true);
  });

  it('KHÔNG cảnh báo thiếu ngày kết thúc cho hợp đồng không xác định thời hạn (đúng bản chất)', () => {
    const { canhBao } = renderHopDongHtml(
      '<p>x</p>',
      fullInput({
        contract: {
          ...fullInput().contract,
          loaiHopDong: 'khong_xac_dinh_thoi_han',
          ngayKetThuc: undefined,
        },
      }),
    );
    expect(canhBao.some((c) => c.includes('Điều 20'))).toBe(false);
  });

  it('cảnh báo khi hợp đồng dùng chức danh fallback (chưa có snapshot lúc ký)', () => {
    const { canhBao } = renderHopDongHtml(
      '<p>{{chucDanh}}</p>',
      fullInput({ contract: { ...fullInput().contract, chucDanh: undefined } }),
    );
    expect(canhBao.some((c) => c.toLowerCase().includes('chức danh'))).toBe(true);
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

  it('sanitize lại HTML ĐÃ GHÉP ngay cả khi script nằm trong TEMPLATE (không phải dữ liệu) — layer phòng thủ độc lập với sanitize lúc lưu (review Critical 1)', () => {
    // Giả lập 1 dòng phieu_template CŨ (lưu trước khi có sanitizer, hoặc lỡ
    // bypass 1 bản sanitizer sau này) — renderHopDongHtml vẫn phải tự sanitize
    // lại output, không tin tưởng mù quáng dữ liệu đã lưu trong DB.
    const tenantTemplateBiXam = '<p>{{hoTenNLD}}</p><script>alert(document.cookie)</script >';
    const { html } = renderHopDongHtml(tenantTemplateBiXam, fullInput());
    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(');
    expect(html).toContain('Nguyễn Văn A');
  });
});
