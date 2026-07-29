import { suyKyHieuNgay, MA_CANH_BAO, SuyKyHieuInput } from './suy-ky-hieu';

/** Lịch T2–T7 (nghỉ Chủ nhật) — cấu hình phổ biến nhất ở VN. */
const T2_T7 = [1, 2, 3, 4, 5, 6];

/** Ngày làm việc bình thường, không có gì xảy ra. 2026-08-03 là thứ Hai. */
function nen(ghiDe: Partial<SuyKyHieuInput> = {}): SuyKyHieuInput {
  return {
    ngay: '2026-08-03',
    ngayVaoLam: '2020-01-01',
    ngayLamViecTrongTuan: T2_T7,
    laNgayLe: false,
    coChamVao: false,
    coChamRa: false,
    coBanGhiNgoaiVung: false,
    ...ghiDe,
  };
}

describe('suyKyHieuNgay — bảng ưu tiên', () => {
  it('dòng 1: ngày trước ngày vào làm → trống, KHÔNG đếm là chưa xử lý', () => {
    const kq = suyKyHieuNgay(nen({ ngayVaoLam: '2026-08-10' }));
    expect(kq.kyHieu).toBeNull();
    expect(kq.chuaXuLy).toBe(false);
    expect(kq.canhBao).toEqual([]);
  });

  it('dòng 1: ngày sau ngày làm việc cuối → trống, KHÔNG đếm là chưa xử lý', () => {
    const kq = suyKyHieuNgay(nen({ ngayLamViecCuoi: '2026-07-31' }));
    expect(kq.kyHieu).toBeNull();
    expect(kq.chuaXuLy).toBe(false);
  });

  it('dòng 1: đúng ngày làm việc cuối thì VẪN tính', () => {
    const kq = suyKyHieuNgay(nen({ ngayLamViecCuoi: '2026-08-03', coChamVao: true, coChamRa: true }));
    expect(kq.kyHieu).toBe('X');
  });

  // CRITICAL A: ngayLamViecCuoi optional, thiếu thì rơi về ngayNopDon (sớm
  // hơn ngày nghỉ thật). Có chấm công SAU mốc đó không được phép biến mất
  // âm thầm — phải chặn chốt và báo rõ.
  it('dòng 1: có chấm vào SAU ngày làm việc cuối → chặn, gắn cờ sau_ngay_nghi_viec', () => {
    const kq = suyKyHieuNgay(nen({ ngayLamViecCuoi: '2026-07-31', coChamVao: true }));
    expect(kq.kyHieu).toBeNull();
    expect(kq.chuaXuLy).toBe(true);
    expect(kq.canhBao).toContain(MA_CANH_BAO.SAU_NGAY_NGHI_VIEC);
  });

  it('dòng 1: có đơn nghỉ SAU ngày làm việc cuối → chặn, gắn cờ sau_ngay_nghi_viec', () => {
    const kq = suyKyHieuNgay(
      nen({
        ngayLamViecCuoi: '2026-07-31',
        donNghi: { loaiDon: 'nghi_phep', loaiNghi: 'phep_nam', laNuaNgay: false },
      }),
    );
    expect(kq.kyHieu).toBeNull();
    expect(kq.chuaXuLy).toBe(true);
    expect(kq.canhBao).toContain(MA_CANH_BAO.SAU_NGAY_NGHI_VIEC);
  });

  it('dòng 1: sau ngày làm việc cuối mà KHÔNG có bằng chứng nào → vẫn trống, im lặng như cũ', () => {
    const kq = suyKyHieuNgay(nen({ ngayLamViecCuoi: '2026-07-31' }));
    expect(kq.kyHieu).toBeNull();
    expect(kq.chuaXuLy).toBe(false);
    expect(kq.canhBao).toEqual([]);
  });

  it('dòng 1: có chấm vào TRƯỚC ngày vào làm → chặn, gắn cờ truoc_ngay_vao_lam', () => {
    const kq = suyKyHieuNgay(nen({ ngayVaoLam: '2026-08-10', coChamVao: true }));
    expect(kq.kyHieu).toBeNull();
    expect(kq.chuaXuLy).toBe(true);
    expect(kq.canhBao).toContain(MA_CANH_BAO.TRUOC_NGAY_VAO_LAM);
  });

  it('dòng 1: có đơn nghỉ TRƯỚC ngày vào làm → chặn, gắn cờ truoc_ngay_vao_lam', () => {
    const kq = suyKyHieuNgay(
      nen({
        ngayVaoLam: '2026-08-10',
        donNghi: { loaiDon: 'nghi_phep', loaiNghi: 'phep_nam', laNuaNgay: false },
      }),
    );
    expect(kq.kyHieu).toBeNull();
    expect(kq.chuaXuLy).toBe(true);
    expect(kq.canhBao).toContain(MA_CANH_BAO.TRUOC_NGAY_VAO_LAM);
  });

  it('dòng 1: trước ngày vào làm mà KHÔNG có bằng chứng nào → vẫn trống, im lặng như cũ', () => {
    const kq = suyKyHieuNgay(nen({ ngayVaoLam: '2026-08-10' }));
    expect(kq.kyHieu).toBeNull();
    expect(kq.chuaXuLy).toBe(false);
    expect(kq.canhBao).toEqual([]);
  });

  // 2026-08-02 là Chủ nhật.
  it('dòng 2: ngày ngoài lịch làm việc → trống, KHÔNG đếm là chưa xử lý', () => {
    const kq = suyKyHieuNgay(nen({ ngay: '2026-08-02' }));
    expect(kq.kyHieu).toBeNull();
    expect(kq.chuaXuLy).toBe(false);
  });

  it('dòng 2: đi làm ngày Chủ nhật vẫn để trống — giờ đó đi vào cột làm thêm', () => {
    const kq = suyKyHieuNgay(nen({ ngay: '2026-08-02', coChamVao: true, coChamRa: true }));
    expect(kq.kyHieu).toBeNull();
    expect(kq.chuaXuLy).toBe(false);
  });

  it('chưa cấu hình lịch làm việc → mọi ngày là ngày làm việc, kể cả Chủ nhật', () => {
    const kq = suyKyHieuNgay(
      nen({ ngay: '2026-08-02', ngayLamViecTrongTuan: undefined, coChamVao: true, coChamRa: true }),
    );
    expect(kq.kyHieu).toBe('X');
  });

  // Lễ rơi vào Chủ nhật của người làm T2–T7: dòng 2 (ngoài lịch làm việc)
  // phải thắng dòng 3 (ngày lễ) — người vốn đã nghỉ hôm đó thì không có thêm
  // một công nghỉ lễ nào để mà cộng.
  it('lễ rơi vào ngày ngoài lịch làm việc → vẫn trống, không phải L', () => {
    const kq = suyKyHieuNgay(nen({ ngay: '2026-08-02', laNgayLe: true }));
    expect(kq.kyHieu).toBeNull();
    expect(kq.chuaXuLy).toBe(false);
  });

  it('dòng 3: ngày lễ → L', () => {
    expect(suyKyHieuNgay(nen({ laNgayLe: true })).kyHieu).toBe('L');
  });

  // Quyết định 4 của spec: tính thành X là ăn mất 1 công nghỉ lễ mà luật cho.
  it('dòng 3: ngày lễ mà đi làm VẪN là L, không phải X', () => {
    const kq = suyKyHieuNgay(nen({ laNgayLe: true, coChamVao: true, coChamRa: true }));
    expect(kq.kyHieu).toBe('L');
  });

  it('dòng 3: ngày lễ thắng cả đơn nghỉ phép', () => {
    const kq = suyKyHieuNgay(
      nen({ laNgayLe: true, donNghi: { loaiDon: 'nghi_phep', loaiNghi: 'phep_nam', laNuaNgay: false } }),
    );
    expect(kq.kyHieu).toBe('L');
  });

  it.each([
    ['phep_nam', 'P'],
    ['khong_luong', 'KL'],
    ['om_dau', 'O'],
    ['thai_san', 'P'],
    ['cuoi_hoi', 'P'],
    ['tang', 'P'],
  ])('dòng 4: đơn nghỉ loại %s → %s', (loaiNghi, kyHieu) => {
    const kq = suyKyHieuNgay(nen({ donNghi: { loaiDon: 'nghi_phep', loaiNghi, laNuaNgay: false } }));
    expect(kq.kyHieu).toBe(kyHieu);
  });

  it('dòng 4: đơn nghỉ bù → NB', () => {
    const kq = suyKyHieuNgay(nen({ donNghi: { loaiDon: 'nghi_bu', laNuaNgay: false } }));
    expect(kq.kyHieu).toBe('NB');
  });

  it('dòng 4: đơn nửa ngày → 1/2 bất kể loại nghỉ', () => {
    const kq = suyKyHieuNgay(nen({ donNghi: { loaiDon: 'nghi_phep', loaiNghi: 'phep_nam', laNuaNgay: true } }));
    expect(kq.kyHieu).toBe('1/2');
  });

  it('dòng 4: loại nghỉ lạ → P (nghỉ hưởng lương), không làm vỡ lưới', () => {
    const kq = suyKyHieuNgay(nen({ donNghi: { loaiDon: 'nghi_phep', loaiNghi: 'loai_moi', laNuaNgay: false } }));
    expect(kq.kyHieu).toBe('P');
  });

  it('dòng 5: có chấm vào và chấm ra → X, không cảnh báo', () => {
    const kq = suyKyHieuNgay(nen({ coChamVao: true, coChamRa: true }));
    expect(kq.kyHieu).toBe('X');
    expect(kq.canhBao).toEqual([]);
  });

  it('dòng 6: ngày làm việc trống trơn → trống VÀ đếm là chưa xử lý', () => {
    const kq = suyKyHieuNgay(nen());
    expect(kq.kyHieu).toBeNull();
    expect(kq.chuaXuLy).toBe(true);
    expect(kq.canhBao).toContain(MA_CANH_BAO.CHUA_XU_LY);
  });
});

describe('suyKyHieuNgay — cờ cảnh báo', () => {
  it('chấm vào không chấm ra → X kèm cờ thiếu giờ ra', () => {
    const kq = suyKyHieuNgay(nen({ coChamVao: true, coChamRa: false }));
    expect(kq.kyHieu).toBe('X');
    expect(kq.canhBao).toContain(MA_CANH_BAO.THIEU_GIO_RA);
  });

  // Chồng lấn nghĩa là MỘT TRONG HAI sai — hoặc đơn nên bị huỷ, hoặc lượt bấm
  // là của người khác. Lấy theo đơn nhưng phải để HR nhìn thấy.
  it('có đơn nghỉ VÀ có chấm công → lấy theo đơn, kèm cờ chồng lấn', () => {
    const kq = suyKyHieuNgay(
      nen({ donNghi: { loaiDon: 'nghi_phep', loaiNghi: 'phep_nam', laNuaNgay: false }, coChamVao: true, coChamRa: true }),
    );
    expect(kq.kyHieu).toBe('P');
    expect(kq.canhBao).toContain(MA_CANH_BAO.DON_VA_CHAM_CONG);
  });

  it('bản ghi ngoài vùng → cờ ngoài vùng, ký hiệu không đổi', () => {
    const kq = suyKyHieuNgay(nen({ coChamVao: true, coChamRa: true, coBanGhiNgoaiVung: true }));
    expect(kq.kyHieu).toBe('X');
    expect(kq.canhBao).toContain(MA_CANH_BAO.NGOAI_VUNG);
  });

  it('ngày ngoài lịch làm việc KHÔNG mang cờ nào, kể cả khi có bản ghi ngoài vùng', () => {
    const kq = suyKyHieuNgay(
      nen({ ngay: '2026-08-02', coChamVao: true, coBanGhiNgoaiVung: true }),
    );
    expect(kq.kyHieu).toBeNull();
    expect(kq.canhBao).toEqual([]);
  });

  it('mỗi lời gọi trả mảng canhBao RIÊNG, không dùng chung', () => {
    const a = suyKyHieuNgay(nen({ ngay: '2026-08-02' }));
    const b = suyKyHieuNgay(nen({ ngay: '2026-08-02' }));
    expect(a.canhBao).not.toBe(b.canhBao);

    a.canhBao.push('ban');
    expect(b.canhBao).toEqual([]);
  });
});
