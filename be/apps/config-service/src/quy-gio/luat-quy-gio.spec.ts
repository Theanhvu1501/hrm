import {
  hanDungCuaKy,
  gioTichTuDonOt,
  phanBoFifo,
  HE_SO_TICH_MAC_DINH,
  lamTronGio,
  QuyKhaDung,
} from './luat-quy-gio';

describe('hanDungCuaKy', () => {
  it('trả ngày cuối của tháng thứ N sau kỳ tích', () => {
    expect(hanDungCuaKy('2026-01', 6)).toBe('2026-07-31');
  });

  it('nhảy đúng sang năm sau', () => {
    expect(hanDungCuaKy('2026-10', 6)).toBe('2027-04-30');
  });

  it('tháng 2 năm nhuận ra 29', () => {
    expect(hanDungCuaKy('2027-08', 6)).toBe('2028-02-29');
  });

  // null = không hết hạn. Trả một ngày THẬT chứ không phải null, để mọi so
  // sánh chuỗi ngày và mọi index vẫn chạy mà không phải rải `if` khắp nơi.
  it('soThangHanDung null cho mốc xa vô hạn', () => {
    expect(hanDungCuaKy('2026-01', null)).toBe('9999-12-31');
  });
});

describe('gioTichTuDonOt', () => {
  it('nhân hệ số theo loại ngày', () => {
    expect(
      gioTichTuDonOt({
        soGioOt: 8,
        loaiNgayOt: 'ngay_le',
        heSoTichQuy: HE_SO_TICH_MAC_DINH,
      }),
    ).toBe(24);
  });

  it('ngày thường dùng hệ số 1.5', () => {
    expect(
      gioTichTuDonOt({
        soGioOt: 4,
        loaiNgayOt: 'ngay_thuong',
        heSoTichQuy: HE_SO_TICH_MAC_DINH,
      }),
    ).toBe(6);
  });

  it('nhận hệ số công ty tự khai, không ép về mặc định', () => {
    expect(
      gioTichTuDonOt({
        soGioOt: 8,
        loaiNgayOt: 'ngay_thuong',
        heSoTichQuy: { ngay_thuong: 1, ngay_nghi: 1, ngay_le: 1 },
      }),
    ).toBe(8);
  });

  // Loại ngày lạ (thêm sau này mà quên cập nhật bảng) rơi về hệ số ngày
  // thường — hệ số THẤP NHẤT. Rơi về hệ số cao là tự tặng giờ cho người nộp.
  it('loại ngày lạ rơi về hệ số ngày thường', () => {
    expect(
      gioTichTuDonOt({
        soGioOt: 2,
        loaiNgayOt: 'ngay_bia_dat',
        heSoTichQuy: HE_SO_TICH_MAC_DINH,
      }),
    ).toBe(3);
  });
});

describe('phanBoFifo', () => {
  const quy = (id: string, hanDung: string, conLai: number): QuyKhaDung => ({
    balanceId: id,
    kyTich: hanDung.slice(0, 7),
    hanDung,
    soGioConLai: conLai,
  });

  it('tiêu quỹ sắp hết hạn trước', () => {
    const kq = phanBoFifo(
      [quy('b2', '2026-12-31', 10), quy('b1', '2026-07-31', 6)],
      8,
    );
    expect(kq).toEqual([
      { balanceId: 'b1', kyTich: '2026-07', soGio: 6 },
      { balanceId: 'b2', kyTich: '2026-12', soGio: 2 },
    ]);
  });

  it('vừa đủ một quỹ thì không đụng quỹ sau', () => {
    const kq = phanBoFifo(
      [quy('b1', '2026-07-31', 8), quy('b2', '2026-12-31', 10)],
      8,
    );
    expect(kq).toEqual([{ balanceId: 'b1', kyTich: '2026-07', soGio: 8 }]);
  });

  // Thiếu số dư PHẢI ném, không được trả phân bổ thiếu: nơi gọi sẽ giữ chỗ
  // theo đúng danh sách này, phân bổ thiếu = cho nghỉ nhiều hơn quỹ có.
  it('không đủ số dư thì ném, không trả phân bổ thiếu', () => {
    expect(() => phanBoFifo([quy('b1', '2026-07-31', 3)], 8)).toThrow(
      /không đủ/i,
    );
  });

  it('bỏ qua quỹ đã cạn', () => {
    const kq = phanBoFifo(
      [quy('b0', '2026-06-30', 0), quy('b1', '2026-07-31', 5)],
      5,
    );
    expect(kq).toEqual([{ balanceId: 'b1', kyTich: '2026-07', soGio: 5 }]);
  });

  it('số giờ cần bằng 0 trả mảng rỗng', () => {
    expect(phanBoFifo([quy('b1', '2026-07-31', 5)], 0)).toEqual([]);
  });
});

/**
 * (review nhánh, IMPORTANT 2) Giá trị dùng ở đây CỐ Ý là giá trị SINH RA DƯ
 * NHỊ PHÂN THẬT, không phải số tròn — một bài test viết bằng 2h/4h/8h sẽ xanh
 * y nguyên kể cả khi không có làm tròn nào, đúng lý do lỗi này sống qua 14
 * vòng review task.
 *
 * Đã KIỂM TỪNG CẶP để chọn: `4h10' × 2.0` (ngày nghỉ) = 8.333333333333334 —
 * chính con số đã lọt ra tới câu "Bạn còn 8.333333333333334 giờ nghỉ bù" mà
 * review nhánh ghi nhận. Lưu ý cặp `2h20' × 3.0` mà đề bài gợi ý lại KHÔNG
 * lệch (IEEE-754 cho đúng 7), nên không dùng làm bằng chứng được.
 */
describe('làm tròn giờ (SO_LE_GIO = 2)', () => {
  const BON_GIO_MUOI = 250 / 60; // 4h10' = 4.166666666666667
  const HAI_GIO_HAI_MUOI = 140 / 60; // 2h20' = 2.3333333333333335

  it('lamTronGio về 2 chữ số và KHÔNG trả -0', () => {
    expect(lamTronGio(HAI_GIO_HAI_MUOI)).toBe(2.33);
    expect(lamTronGio(8.333333333333334)).toBe(8.33);
    expect(Object.is(lamTronGio(-1e-16), 0)).toBe(true);
  });

  it("4h10' ngày nghỉ (hệ số 2.0) ra 8.33 chứ không phải 8.333333333333334", () => {
    // Chứng minh phép nhân thô THẬT SỰ lệch — nếu không, bài test dưới vô
    // nghĩa vì nó "đúng" cả khi không làm tròn.
    expect(BON_GIO_MUOI * 2).toBe(8.333333333333334);

    expect(
      gioTichTuDonOt({
        soGioOt: BON_GIO_MUOI,
        loaiNgayOt: 'ngay_nghi',
        heSoTichQuy: HE_SO_TICH_MAC_DINH,
      }),
    ).toBe(8.33);
  });

  it("2h20' ngày lễ (hệ số 3.0) vẫn ra ĐÚNG 7 — làm tròn không phá số vốn đã sạch", () => {
    expect(
      gioTichTuDonOt({
        soGioOt: HAI_GIO_HAI_MUOI,
        loaiNgayOt: 'ngay_le',
        heSoTichQuy: HE_SO_TICH_MAC_DINH,
      }),
    ).toBe(7);
  });

  it('nhân hệ số TRƯỚC rồi mới làm tròn — không mất 0.01 giờ của NLĐ', () => {
    // Làm tròn soGioOt trước (2.33) rồi nhân 3 sẽ ra 6.99. Bài test này chốt
    // đúng thứ tự đó.
    expect(
      gioTichTuDonOt({
        soGioOt: HAI_GIO_HAI_MUOI,
        loaiNgayOt: 'ngay_le',
        heSoTichQuy: HE_SO_TICH_MAC_DINH,
      }),
    ).not.toBe(6.99);
  });
});

describe('phanBoFifo — epsilon', () => {
  // Ba kỳ tích 8.33 / 8.33 / 8.34 giờ — số dư ĐÃ LÀM TRÒN đúng như service
  // đưa vào (`quyKhaDung()` làm tròn 2 chữ số) — tổng hiển thị 25.00 giờ.
  // Yêu cầu ĐÚNG BẰNG số đang hiển thị. Không có epsilon, `conCan` kết thúc
  // ở 1.7763568394002505e-15 > 0 và hàm ném "cần 25 giờ, chỉ còn 25 giờ" —
  // đúng câu vô lý mà review nhánh đo được. CỐ Ý chọn 3 kỳ chứ không 2:
  // 8.33 + 4.17 = 12.5 trừ ra ĐÚNG 0 và sẽ không phơi bày được lỗi.
  const quy = (i: number, soGioConLai: number): QuyKhaDung => ({
    balanceId: `b${i}`,
    kyTich: `2026-0${i}`,
    hanDung: `2026-0${i + 1}-28`,
    soGioConLai,
  });
  const BA_KY = [quy(1, 8.33), quy(2, 8.33), quy(3, 8.34)];

  it('yêu cầu ĐÚNG BẰNG số dư trải qua 3 kỳ vẫn phân bổ được, không ném', () => {
    // Chứng minh dư nhị phân THẬT SỰ tồn tại — nếu không, bài test dưới
    // "đúng" cả khi không có epsilon và do đó vô nghĩa.
    let conCan = 25;
    for (const q of BA_KY) conCan -= q.soGioConLai;
    expect(conCan).toBeGreaterThan(0);

    expect(() => phanBoFifo(BA_KY, 25)).not.toThrow();
    const kq = phanBoFifo(BA_KY, 25);
    expect(kq).toHaveLength(3);
    expect(kq.map((p) => p.soGio)).toEqual([8.33, 8.33, 8.34]);
  });

  it('thiếu THẬT vẫn ném, và câu lỗi dùng số đã làm tròn (không phải 8.333333…)', () => {
    expect(() => phanBoFifo([quy(1, 8.33)], 8.333333333333334 + 1)).toThrow(
      /cần 9\.33 giờ, chỉ còn 8\.33 giờ/,
    );
  });

  it('dư nhị phân dưới epsilon không sinh thêm một dòng phân bổ 0 giờ', () => {
    expect(phanBoFifo(BA_KY, 25).every((p) => p.soGio > 0)).toBe(true);
  });
});

/**
 * Mọi hệ số ở đây cố ý KHÁC nhau và khác `ngay_thuong`. Đường cũ (`if/else`
 * ba nhánh) rơi loại lạ về `ngay_thuong`, nên nếu fixture để `ngay_dem` bằng
 * `ngay_thuong` thì hai đường ra cùng một con số và test xanh vì trùng ngẫu
 * nhiên chứ không vì đúng.
 */
describe('gioTichTuDonOt với phanBoOt (P4.2b)', () => {
  const heSoTichQuy = { ngay_thuong: 1.5, ngay_nghi: 2.0, ngay_le: 3.0, ngay_dem: 2.5 };

  it('cộng theo từng phần, dùng hệ số SNAPSHOT chứ không tra lại cấu hình', () => {
    // Cấu hình hiện tại để ngay_dem = 4.0, nhưng đơn snapshot 2.0 lúc nộp —
    // phải giữ 2.0, nếu không thì sửa cấu hình là đổi giờ của đơn đã duyệt.
    expect(
      gioTichTuDonOt({
        soGioOt: 6,
        loaiNgayOt: 'ngay_dem',
        heSoTichQuy: { ...heSoTichQuy, ngay_dem: 4.0 },
        phanBoOt: [
          { loaiNgayOt: 'ngay_thuong', soGio: 2, heSoTra: 1.5, heSoTichQuy: 1.5 },
          { loaiNgayOt: 'ngay_dem', soGio: 4, heSoTra: 2.0, heSoTichQuy: 2.0 },
        ],
      }),
    ).toBe(11); // 2×1.5 + 4×2.0 — đường cũ sẽ ra 6×1.5 = 9
  });

  it('HỒI QUY: đơn một phần cho ĐÚNG con số đường cũ — 2h20 ngày lễ = 7.00', () => {
    const soGioOt = 2 + 20 / 60;
    const cu = gioTichTuDonOt({ soGioOt, loaiNgayOt: 'ngay_le', heSoTichQuy });
    const moi = gioTichTuDonOt({
      soGioOt,
      loaiNgayOt: 'ngay_le',
      heSoTichQuy,
      phanBoOt: [
        { loaiNgayOt: 'ngay_le', soGio: soGioOt, heSoTra: 3.0, heSoTichQuy: 3.0 },
      ],
    });
    expect(cu).toBe(7);
    expect(moi).toBe(7); // KHÔNG phải 6.99 — làm tròn vẫn ở SAU phép nhân
  });

  it('đơn cũ không có phanBoOt rơi về đường cũ, TRA BẢNG chứ không if/else', () => {
    // if/else ba nhánh sẽ ra 4×1.5 = 6 vì `ngay_dem` không khớp nhánh nào.
    expect(gioTichTuDonOt({ soGioOt: 4, loaiNgayOt: 'ngay_dem', heSoTichQuy })).toBe(10);
    // Loại thật sự lạ mới rơi về ngay_thuong — hệ số THẤP nhất.
    expect(gioTichTuDonOt({ soGioOt: 4, loaiNgayOt: 'loai_la', heSoTichQuy })).toBe(6);
  });

  it('phanBoOt rỗng xử như không có', () => {
    expect(
      gioTichTuDonOt({ soGioOt: 4, loaiNgayOt: 'ngay_le', heSoTichQuy, phanBoOt: [] }),
    ).toBe(12);
  });
});
