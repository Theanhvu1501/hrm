import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OvertimeBalance, OvertimeBalanceEntry, CauHinhLuong } from '@app/entities';
import { QuyGio_Service } from './quy-gio.service';

// Repo giả tối thiểu: giữ mảng trong bộ nhớ, đủ để kiểm luật cộng trừ và sổ.
function repoGia(khoiTao: any[] = []) {
  const rows = [...khoiTao];
  // CAS (P4.2b Task 1): filter chứa đúng các giá trị đã đọc, nên khớp = chưa
  // ai chen vào giữa đọc và ghi.
  const findOneAndUpdate = jest.fn(
    async (filter: any, update: any, _opts?: any) => {
      // Bắt lỗi fixture thiếu `_id` cho ồn ào, thay vì để `undefined ===
      // undefined` khớp nhầm hàng đầu tiên và làm test xanh giả.
      if (!('_id' in filter) || filter._id === undefined) {
        throw new Error(
          'repoGia.findOneAndUpdate: filter thiếu _id — fixture phải khai _id',
        );
      }
      const i = rows.findIndex((r) =>
        Object.entries(filter).every(([k, v]) => r[k] === v),
      );
      if (i < 0) return null;
      rows[i] = { ...rows[i], ...(update.$set ?? {}) };
      return rows[i];
    },
  );
  return {
    rows,
    findOneAndUpdate,
    manager: { getMongoRepository: () => ({ findOneAndUpdate }) },
    find: jest.fn(async ({ where }: any = {}) =>
      rows.filter((r) =>
        Object.entries(where ?? {}).every(([k, v]) => r[k] === v),
      ),
    ),
    findOne: jest.fn(async ({ where }: any = {}) =>
      rows.find((r) =>
        Object.entries(where ?? {}).every(([k, v]) => r[k] === v),
      ) ?? null,
    ),
    create: jest.fn((x: any) => ({ ...x })),
    save: jest.fn(async (x: any) => {
      const i = rows.findIndex((r) => r._id && r._id === x._id);
      if (i >= 0) rows[i] = x;
      else {
        x._id = x._id ?? `id-${rows.length + 1}`;
        rows.push(x);
      }
      return x;
    }),
  };
}

const cauHinhMacDinh = {
  soGioMoiNgay: 8,
  lamThem: {
    cheDoBu: 'chi_nghi_bu',
    heSoTichQuy: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 3 },
    soThangHanDung: 6,
    khiHetHan: 'quy_ra_tien',
  },
};

async function dungService(opts: { quy?: any[]; so?: any[]; cauHinh?: any } = {}) {
  const quyRepo = repoGia(opts.quy);
  const soRepo = repoGia(opts.so);
  // `??` xem `null` là nullish nên `[opts.cauHinh ?? cauHinhMacDinh]` sẽ LUÔN
  // ra một hàng — kể cả khi test cố tình truyền `cauHinh: null` để mô phỏng
  // "công ty chưa khai cấu hình" (tức cauHinhRepo phải RỖNG). Phân biệt rõ
  // ba trường hợp: không truyền → mặc định; truyền null → rỗng thật sự;
  // truyền object → dùng đúng object đó.
  const cauHinhRepo = repoGia(
    opts.cauHinh === undefined
      ? [cauHinhMacDinh]
      : opts.cauHinh
        ? [opts.cauHinh]
        : [],
  );

  const mod = await Test.createTestingModule({
    providers: [
      QuyGio_Service,
      { provide: getRepositoryToken(OvertimeBalance), useValue: quyRepo },
      { provide: getRepositoryToken(OvertimeBalanceEntry), useValue: soRepo },
      { provide: getRepositoryToken(CauHinhLuong), useValue: cauHinhRepo },
    ],
  }).compile();

  return { service: mod.get(QuyGio_Service), quyRepo, soRepo };
}

const donOt = (over: any = {}) => ({
  employeeId: 'nv1',
  employeeName: 'Nguyễn Văn Hải',
  employeeCode: 'NV0001',
  ngay: '2026-01-15',
  soGioOt: 8,
  loaiNgayOt: 'ngay_thuong',
  requestId: 'don1',
  nguoiThucHien: 'hr1',
  ...over,
});

describe('QuyGio_Service.tichTuDonOt', () => {
  it('tạo quỹ mới cho kỳ tích và cộng giờ ĐÃ nhân hệ số', async () => {
    const { service, quyRepo } = await dungService();

    await service.tichTuDonOt(donOt());

    expect(quyRepo.rows).toHaveLength(1);
    expect(quyRepo.rows[0]).toMatchObject({
      employeeId: 'nv1',
      kyTich: '2026-01',
      soGioTich: 12, // 8 × 1.5
      soGioConLai: 12,
      hanDung: '2026-07-31',
      trangThai: 'dang_hieu_luc',
    });
  });

  it('cộng dồn vào quỹ sẵn có cùng kỳ, không tạo hàng thứ hai', async () => {
    const { service, quyRepo } = await dungService();

    await service.tichTuDonOt(donOt({ requestId: 'don1' }));
    await service.tichTuDonOt(donOt({ requestId: 'don2', soGioOt: 4 }));

    expect(quyRepo.rows).toHaveLength(1);
    expect(quyRepo.rows[0].soGioTich).toBe(18); // 12 + 6
  });

  it('ngày lễ tích theo hệ số 3.0', async () => {
    const { service, quyRepo } = await dungService();

    await service.tichTuDonOt(donOt({ loaiNgayOt: 'ngay_le' }));

    expect(quyRepo.rows[0].soGioTich).toBe(24);
  });

  it('ghi một dòng sổ kèm requestId cho mỗi lần tích', async () => {
    const { service, soRepo } = await dungService();

    await service.tichTuDonOt(donOt());

    expect(soRepo.rows).toHaveLength(1);
    expect(soRepo.rows[0]).toMatchObject({
      employeeId: 'nv1',
      kyTich: '2026-01',
      soGio: 12,
      lyDo: 'duyet_don_ot',
      requestId: 'don1',
      nguoiThucHien: 'hr1',
    });
  });

  it('không tích khi chế độ là chi_tien', async () => {
    const { service, quyRepo } = await dungService({
      cauHinh: {
        ...cauHinhMacDinh,
        lamThem: { ...cauHinhMacDinh.lamThem, cheDoBu: 'chi_tien' },
      },
    });

    await service.tichTuDonOt(donOt());

    expect(quyRepo.rows).toHaveLength(0);
  });

  it('soThangHanDung null cho hạn dùng vô hạn', async () => {
    const { service, quyRepo } = await dungService({
      cauHinh: {
        ...cauHinhMacDinh,
        lamThem: { ...cauHinhMacDinh.lamThem, soThangHanDung: null },
      },
    });

    await service.tichTuDonOt(donOt());

    expect(quyRepo.rows[0].hanDung).toBe('9999-12-31');
  });

  // Công ty chưa khai cấu hình thì KHÔNG được im lặng tích theo mặc định:
  // hệ số sai là sai thành giờ nghỉ thật của người lao động.
  it('chưa có cấu hình thì không tích và KHÔNG ném', async () => {
    // Không ném là cố ý: đơn OT là bản ghi chính, việc duyệt nó không được
    // hỏng chỉ vì công ty quên khai cấu hình. Bỏ qua + log, HR cấp bù tay.
    const { service, quyRepo } = await dungService({ cauHinh: null as any });

    await expect(service.tichTuDonOt(donOt())).resolves.toBeUndefined();
    expect(quyRepo.rows).toHaveLength(0);
  });

  // Bấm duyệt hai lần / retry sau lỗi mạng gọi lại đúng requestId — không
  // được cộng giờ hai lần cho một sự kiện duyệt duy nhất.
  it('gọi lại cùng requestId chỉ áp dụng một lần (chống trùng)', async () => {
    const { service, quyRepo, soRepo } = await dungService();

    await service.tichTuDonOt(donOt());
    await service.tichTuDonOt(donOt()); // gọi lại y hệt, cùng requestId 'don1'

    expect(quyRepo.rows).toHaveLength(1);
    expect(quyRepo.rows[0].soGioTich).toBe(12); // không cộng lần hai
    expect(soRepo.rows).toHaveLength(1); // chỉ một dòng sổ duyet_don_ot
  });
});

// Rollout blocker: `dangKichHoat()` là cửa mà `DonChamCong_Service.create()`
// phải hỏi TRƯỚC khi gọi `phanBoChoNghiBu()` cho đơn nghỉ bù — PHẢI đi qua
// đúng `layCauHinh()`, cùng nguồn với `tichTuDonOt()` ở trên, để tích/tiêu
// không bao giờ lệch pha nhau về việc quỹ "đã bật" hay chưa.
describe('QuyGio_Service.dangKichHoat', () => {
  it('công ty CHƯA khai cấu hình (layCauHinh trả null) → false', async () => {
    const { service } = await dungService({ cauHinh: null as any });

    await expect(service.dangKichHoat()).resolves.toBe(false);
  });

  it('công ty ĐÃ khai lamThem → true', async () => {
    const { service } = await dungService(); // cauHinhMacDinh có lamThem

    await expect(service.dangKichHoat()).resolves.toBe(true);
  });
});

describe('QuyGio_Service.thuHoiTichTuDonOt', () => {
  it('thu hồi lần đầu: trừ giờ khỏi quỹ và ghi một dòng sổ huy_don_ot', async () => {
    const { service, quyRepo, soRepo } = await dungService();
    await service.tichTuDonOt(donOt()); // don1: +12h vào nv1/2026-01

    await service.thuHoiTichTuDonOt('don1', 'nv1', 'hr1');

    expect(quyRepo.rows[0].soGioTich).toBe(0);
    expect(quyRepo.rows[0].soGioConLai).toBe(0);
    expect(soRepo.rows).toHaveLength(2);
    expect(soRepo.rows[1]).toMatchObject({
      employeeId: 'nv1',
      kyTich: '2026-01',
      soGio: -12,
      lyDo: 'huy_don_ot',
      requestId: 'don1',
      nguoiThucHien: 'hr1',
    });
  });

  // Kịch bản đúng cái reviewer nêu: thu hồi don1 xong, một đơn KHÁC (don4)
  // tích vào cùng kỳ, rồi thu hồi don1 bị gọi LẶP LẠI (retry/double-click).
  // Sổ append-only nên dòng duyet_don_ot cũ của don1 vẫn còn — nếu lặp lại
  // theo dòng cũ thay vì theo RÒNG, lần gọi lặp sẽ trừ nhầm vào giờ của don4.
  it('gọi thu hồi lặp lại không được ăn vào giờ của đơn khác tích sau đó cùng kỳ', async () => {
    const { service, quyRepo } = await dungService();

    await service.tichTuDonOt(donOt()); // don1: +12h vào nv1/2026-01
    await service.thuHoiTichTuDonOt('don1', 'nv1', 'hr1'); // -12h => soGioTich = 0
    await service.tichTuDonOt(
      donOt({ requestId: 'don4', soGioOt: 10, loaiNgayOt: 'ngay_nghi' }),
    ); // don4 không liên quan: +20h (10 × 2) vào cùng kỳ nv1/2026-01

    await service.thuHoiTichTuDonOt('don1', 'nv1', 'hr1'); // gọi lặp lại don1

    expect(quyRepo.rows[0].soGioTich).toBe(20); // giờ của don4 còn nguyên
  });
});

describe('QuyGio_Service.soDuKhaDung', () => {
  it('cộng số dư các quỹ còn hiệu lực và chưa quá hạn', async () => {
    const { service } = await dungService({
      quy: [
        {
          _id: 'b1', employeeId: 'nv1', kyTich: '2026-01', soGioTich: 12,
          soGioDaDung: 2, soGioDangChoDuyet: 0, soGioConLai: 10,
          hanDung: '2026-07-31', trangThai: 'dang_hieu_luc', isActive: true,
        },
        {
          _id: 'b2', employeeId: 'nv1', kyTich: '2025-06', soGioTich: 8,
          soGioDaDung: 0, soGioDangChoDuyet: 0, soGioConLai: 8,
          hanDung: '2025-12-31', trangThai: 'dang_hieu_luc', isActive: true,
        },
      ],
    });

    const kq = await service.soDuKhaDung('nv1', '2026-02-01');

    expect(kq.soGioConLai).toBe(10); // b2 đã quá hạn
    expect(kq.theoKy).toEqual([
      { kyTich: '2026-01', hanDung: '2026-07-31', soGioConLai: 10 },
    ]);
  });

  it('không có quỹ nào trả 0', async () => {
    const { service } = await dungService();
    const kq = await service.soDuKhaDung('nv1', '2026-02-01');
    expect(kq.soGioConLai).toBe(0);
    expect(kq.theoKy).toEqual([]);
  });
});

describe('QuyGio_Service — vòng đời giữ chỗ', () => {
  const quyMau = (over: any = {}) => ({
    _id: 'b1', employeeId: 'nv1', kyTich: '2026-01', soGioTich: 12,
    soGioDaDung: 0, soGioDangChoDuyet: 0, soGioConLai: 12,
    hanDung: '2026-07-31', trangThai: 'dang_hieu_luc', isActive: true,
    ...over,
  });

  it('phân bổ theo FIFO hạn dùng gần nhất', async () => {
    const { service } = await dungService({
      quy: [
        quyMau({ _id: 'b2', kyTich: '2026-03', hanDung: '2026-09-30', soGioTich: 10, soGioConLai: 10 }),
        quyMau({ _id: 'b1', kyTich: '2026-01', hanDung: '2026-07-31', soGioTich: 6, soGioConLai: 6 }),
      ],
    });

    const kq = await service.phanBoChoNghiBu('nv1', 8, '2026-04-01');

    expect(kq).toEqual([
      { balanceId: 'b1', kyTich: '2026-01', soGio: 6 },
      { balanceId: 'b2', kyTich: '2026-03', soGio: 2 },
    ]);
  });

  it('thiếu số dư thì ném 409 kèm mã lỗi và số giờ còn lại', async () => {
    const { service } = await dungService({ quy: [quyMau({ soGioConLai: 3, soGioTich: 3 })] });

    await expect(service.phanBoChoNghiBu('nv1', 8, '2026-02-01')).rejects.toMatchObject({
      response: { code: 'QUY_GIO_KHONG_DU_SO_DU' },
    });
  });

  it('giuCho tăng dangChoDuyet và giảm conLai, ghi sổ', async () => {
    const { service, quyRepo, soRepo } = await dungService({ quy: [quyMau()] });

    await service.giuCho('nv1', [{ balanceId: 'b1', kyTich: '2026-01', soGio: 4 }], 'don9', 'nv1');

    expect(quyRepo.rows[0]).toMatchObject({ soGioDangChoDuyet: 4, soGioConLai: 8 });
    expect(soRepo.rows[0]).toMatchObject({ soGio: -4, lyDo: 'giu_cho_nghi_bu', requestId: 'don9' });
  });

  it('hai đơn cùng lúc không cùng ăn một số dư', async () => {
    const { service } = await dungService({ quy: [quyMau({ soGioTich: 6, soGioConLai: 6 })] });

    await service.giuCho('nv1', [{ balanceId: 'b1', kyTich: '2026-01', soGio: 6 }], 'donA', 'nv1');

    await expect(
      service.giuCho('nv1', [{ balanceId: 'b1', kyTich: '2026-01', soGio: 4 }], 'donB', 'nv1'),
    ).rejects.toMatchObject({ response: { code: 'QUY_GIO_KHONG_DU_SO_DU' } });
  });

  it('nhaCho trả lại số dư', async () => {
    const { service, quyRepo } = await dungService({
      quy: [quyMau({ soGioDangChoDuyet: 4, soGioConLai: 8 })],
    });

    await service.nhaCho('nv1', [{ balanceId: 'b1', kyTich: '2026-01', soGio: 4 }], 'don9', 'hr1');

    expect(quyRepo.rows[0]).toMatchObject({ soGioDangChoDuyet: 0, soGioConLai: 12 });
  });

  it('chuyenSangDaDung dời từ giữ chỗ sang đã dùng, conLai không đổi', async () => {
    const { service, quyRepo } = await dungService({
      quy: [quyMau({ soGioDangChoDuyet: 4, soGioConLai: 8 })],
    });

    await service.chuyenSangDaDung('nv1', [{ balanceId: 'b1', kyTich: '2026-01', soGio: 4 }], 'don9', 'hr1');

    expect(quyRepo.rows[0]).toMatchObject({
      soGioDangChoDuyet: 0, soGioDaDung: 4, soGioConLai: 8,
    });
  });

  it('hoanTraDaDung trả lại phần đã dùng', async () => {
    const { service, quyRepo } = await dungService({
      quy: [quyMau({ soGioDaDung: 4, soGioConLai: 8 })],
    });

    await service.hoanTraDaDung('nv1', [{ balanceId: 'b1', kyTich: '2026-01', soGio: 4 }], 'don9', 'hr1');

    expect(quyRepo.rows[0]).toMatchObject({ soGioDaDung: 0, soGioConLai: 12 });
  });

  // Task 5, quyết định cân nhắc riêng (ngoài brief): giuCho/chuyenSangDaDung
  // là hai hàm "tiến" không có Math.max chặn trần — gọi lại cùng requestId
  // (bấm hai lần, retry sau lỗi mạng) phải là no-op, không được cộng dồn đè.
  // Chặn bằng guard `demRongTheoLyDo()` NGAY TRƯỚC khi vào apDung() — phần tử
  // đã trùng bị lọc khỏi `phanBo` nên không tới lượt ghi số dư lẫn ghi sổ.
  it('giuCho gọi lại cùng requestId không giữ chỗ hai lần (chống trùng)', async () => {
    const { service, quyRepo, soRepo } = await dungService({ quy: [quyMau()] });

    await service.giuCho('nv1', [{ balanceId: 'b1', kyTich: '2026-01', soGio: 4 }], 'don9', 'nv1');
    await service.giuCho('nv1', [{ balanceId: 'b1', kyTich: '2026-01', soGio: 4 }], 'don9', 'nv1');

    expect(quyRepo.rows[0]).toMatchObject({ soGioDangChoDuyet: 4, soGioConLai: 8 });
    expect(soRepo.rows).toHaveLength(1);
  });

  it('chuyenSangDaDung gọi lại cùng requestId không cộng dồn soGioDaDung hai lần (chống trùng)', async () => {
    const { service, quyRepo, soRepo } = await dungService({
      quy: [quyMau({ soGioDangChoDuyet: 4, soGioConLai: 8 })],
    });

    await service.chuyenSangDaDung('nv1', [{ balanceId: 'b1', kyTich: '2026-01', soGio: 4 }], 'don9', 'hr1');
    await service.chuyenSangDaDung('nv1', [{ balanceId: 'b1', kyTich: '2026-01', soGio: 4 }], 'don9', 'hr1');

    expect(quyRepo.rows[0]).toMatchObject({
      soGioDangChoDuyet: 0, soGioDaDung: 4, soGioConLai: 8,
    });
    expect(soRepo.rows).toHaveLength(1);
  });

  // Review round: nhaCho/hoanTraDaDung không có guard lọc trước (xem
  // doc-comment `demRongTheoLyDo`/`apDung` trong service — Math.max(0, …) đã
  // đủ chặn SỐ DƯ khỏi âm), nhưng bản thân apDung() phải TỰ nhận ra một lần
  // gọi lại là no-op thật (đã bị Math.max kẹp về đúng giá trị cũ) và KHÔNG
  // ghi thêm dòng sổ — nếu không, `doiSoat()` (Task 12) dựng lại số dư từ sổ
  // sẽ cộng dư phần bị ghi trùng và báo lệch giả trên một quỹ hoàn toàn đúng.
  it('nhaCho gọi lại cùng requestId không sinh dòng sổ ma — số dư và tổng sổ khớp nhau', async () => {
    const { service, quyRepo, soRepo } = await dungService({
      quy: [quyMau({ soGioDangChoDuyet: 4, soGioConLai: 8 })],
    });

    await service.nhaCho('nv1', [{ balanceId: 'b1', kyTich: '2026-01', soGio: 4 }], 'don9', 'hr1');
    await service.nhaCho('nv1', [{ balanceId: 'b1', kyTich: '2026-01', soGio: 4 }], 'don9', 'hr1');

    expect(quyRepo.rows[0]).toMatchObject({ soGioDangChoDuyet: 0, soGioConLai: 12 });
    expect(soRepo.rows).toHaveLength(1); // lần gọi lại không ghi thêm — đã bị kẹp về 0, không có gì để nhả nữa
    expect(soRepo.rows.reduce((t, r) => t + r.soGio, 0)).toBe(4); // đúng bằng số giờ THẬT đã nhả
  });

  it('hoanTraDaDung gọi lại cùng requestId không sinh dòng sổ ma — số dư và tổng sổ khớp nhau', async () => {
    const { service, quyRepo, soRepo } = await dungService({
      quy: [quyMau({ soGioDaDung: 4, soGioConLai: 8 })],
    });

    await service.hoanTraDaDung('nv1', [{ balanceId: 'b1', kyTich: '2026-01', soGio: 4 }], 'don9', 'hr1');
    await service.hoanTraDaDung('nv1', [{ balanceId: 'b1', kyTich: '2026-01', soGio: 4 }], 'don9', 'hr1');

    expect(quyRepo.rows[0]).toMatchObject({ soGioDaDung: 0, soGioConLai: 12 });
    expect(soRepo.rows).toHaveLength(1);
    expect(soRepo.rows.reduce((t, r) => t + r.soGio, 0)).toBe(4);
  });
});

describe('QuyGio_Service — đóng quỹ hết hạn', () => {
  // Factory, KHÔNG phải const dùng chung: `dongQuyGio` mutate thẳng object
  // `quy` lấy từ `findOne()` (cùng nếp với `tichTuDonOt`/`apDung` phía trên)
  // — nếu nhiều `it()` cùng share một object literal, mutate ở test này sẽ
  // rò sang test chạy sau trong cùng describe (fake repo không clone khi save).
  const quyHetHan = (over: any = {}) => ({
    _id: 'b1', employeeId: 'nv1', employeeName: 'Hải', kyTich: '2025-06',
    soGioTich: 8, soGioDaDung: 2, soGioDangChoDuyet: 0, soGioConLai: 6,
    hanDung: '2025-12-31', trangThai: 'dang_hieu_luc', isActive: true,
    ...over,
  });
  const quyConHan = (over: any = {}) =>
    quyHetHan({ _id: 'b2', kyTich: '2026-01', hanDung: '2026-07-31', ...over });

  it('xem trước liệt kê đúng quỹ sẽ đóng, KHÔNG ghi gì', async () => {
    const { service, quyRepo } = await dungService({ quy: [quyHetHan(), quyConHan()] });

    const ds = await service.xemTruocDongQuy('2026-02-01');

    expect(ds.seDong).toEqual([
      expect.objectContaining({ balanceId: 'b1', kyTich: '2025-06', soGioConLai: 6 }),
    ]);
    expect(ds.vuongCho).toEqual([]);
    expect(quyRepo.rows.find((r: any) => r._id === 'b1').trangThai).toBe('dang_hieu_luc');
  });

  /**
   * (review nhánh, IMPORTANT 4) Quỹ quá hạn NHƯNG còn giữ chỗ sống.
   *
   * Kịch bản mất/nhân đôi giờ nếu cứ đóng: quỹ `soGioTich 12,
   * soGioDangChoDuyet 4, soGioConLai 8` bị đóng và ghi sổ `-8`; đơn nghỉ bù
   * đang chờ sau đó bị từ chối → `nhaCho()` chạy trên quỹ đã đóng →
   * `tinhLaiConLai()` dựng `soGioConLai` về 12. Bốn giờ đó vô hình với
   * `soDuKhaDung()` (chỉ nhìn `dang_hieu_luc`) và chưa từng có trong con số
   * chốt lúc đóng.
   */
  describe('quỹ còn giữ chỗ sống thì KHÔNG đóng, chỉ cảnh báo', () => {
    const quyVuongCho = () =>
      quyHetHan({ soGioTich: 12, soGioDaDung: 0, soGioDangChoDuyet: 4, soGioConLai: 8 });

    it('xem trước tách nó ra ô cảnh báo riêng, KHÔNG nằm trong danh sách sẽ đóng', async () => {
      const { service } = await dungService({ quy: [quyVuongCho()] });

      const ds = await service.xemTruocDongQuy('2026-02-01');

      expect(ds.seDong).toEqual([]);
      expect(ds.vuongCho).toEqual([
        expect.objectContaining({
          balanceId: 'b1',
          kyTich: '2025-06',
          soGioConLai: 8,
          soGioDangChoDuyet: 4,
        }),
      ]);
    });

    it('dongQuyGio bỏ qua nó: không đổi trạng thái, không ghi sổ, báo số quỹ vướng', async () => {
      const { service, quyRepo, soRepo } = await dungService({ quy: [quyVuongCho()] });

      const tomTat = await service.dongQuyGio('2026-02-01', 'hr1');

      expect(tomTat).toMatchObject({
        soQuyDong: 0,
        soGioHetHan: 0,
        soQuyVuongCho: 1,
      });
      expect(quyRepo.rows[0].trangThai).toBe('dang_hieu_luc');
      expect(soRepo.rows).toHaveLength(0);
    });

    it('HR nhả chỗ xong chạy lại thì đóng bình thường — cảnh báo là tạm, không phải khoá', async () => {
      const { service, quyRepo, soRepo } = await dungService({ quy: [quyVuongCho()] });

      await service.nhaCho(
        'nv1',
        [{ balanceId: 'b1', kyTich: '2025-06', soGio: 4 }],
        'don-treo',
        'hr1',
      );
      const tomTat = await service.dongQuyGio('2026-02-01', 'hr1');

      expect(tomTat).toMatchObject({ soQuyDong: 1, soGioHetHan: 12, soQuyVuongCho: 0 });
      expect(quyRepo.rows[0].trangThai).toBe('da_dong');
      expect(soRepo.rows.some((d: any) => d.lyDo === 'quy_ra_tien' && d.soGio === -12)).toBe(true);
    });

    it('quỹ khác cùng lượt vẫn đóng bình thường — một quỹ vướng không chặn cả mẻ', async () => {
      const { service, quyRepo } = await dungService({
        quy: [
          quyVuongCho(),
          quyHetHan({ _id: 'b3', kyTich: '2025-07', hanDung: '2025-12-31' }),
        ],
      });

      const tomTat = await service.dongQuyGio('2026-02-01', 'hr1');

      expect(tomTat).toMatchObject({ soQuyDong: 1, soQuyVuongCho: 1 });
      expect(quyRepo.rows.find((r: any) => r._id === 'b1').trangThai).toBe('dang_hieu_luc');
      expect(quyRepo.rows.find((r: any) => r._id === 'b3').trangThai).toBe('da_dong');
    });
  });

  it('đóng quỹ quá hạn và ghi sổ', async () => {
    const { service, quyRepo, soRepo } = await dungService({ quy: [quyHetHan(), quyConHan()] });

    const tomTat = await service.dongQuyGio('2026-02-01', 'hr1');

    expect(tomTat).toMatchObject({ soQuyDong: 1, soGioChoTraTien: 6 });
    expect(quyRepo.rows.find((r: any) => r._id === 'b1').trangThai).toBe('da_dong');
    expect(quyRepo.rows.find((r: any) => r._id === 'b2').trangThai).toBe('dang_hieu_luc');
    expect(soRepo.rows[0]).toMatchObject({ lyDo: 'quy_ra_tien', soGio: -6 });
  });

  // khiHetHan='huy_bo' thì giờ mất hẳn — vẫn phải để lại vết trong sổ, nếu
  // không nhân viên hỏi "sao tôi mất 6 giờ" là không ai trả lời được.
  it('chế độ huy_bo ghi sổ het_han thay vì quy_ra_tien', async () => {
    const { service, soRepo } = await dungService({
      quy: [quyHetHan()],
      cauHinh: {
        ...cauHinhMacDinh,
        lamThem: { ...cauHinhMacDinh.lamThem, khiHetHan: 'huy_bo' },
      },
    });

    const tomTat = await service.dongQuyGio('2026-02-01', 'hr1');

    expect(tomTat.soGioChoTraTien).toBe(0);
    expect(soRepo.rows[0]).toMatchObject({ lyDo: 'het_han', soGio: -6 });
  });

  it('quỹ đã đóng rồi thì không đóng lại', async () => {
    const { service } = await dungService({
      quy: [quyHetHan({ trangThai: 'da_dong' })],
    });

    expect((await service.dongQuyGio('2026-02-01', 'hr1')).soQuyDong).toBe(0);
  });

  // Quỹ đã đóng hết giờ (soGioConLai = 0) trước khi hết hạn: vẫn phải chuyển
  // trangThai sang da_dong (nếu không sẽ bị xemTruocDongQuy liệt kê lại mãi
  // mỗi lần chạy), nhưng KHÔNG được ghi một dòng sổ -0 giờ vô nghĩa.
  it('quỹ hết hạn nhưng đã dùng sạch (soGioConLai = 0) đóng sạch, không ghi sổ', async () => {
    const { service, quyRepo, soRepo } = await dungService({
      quy: [quyHetHan({ soGioDaDung: 8, soGioConLai: 0 })],
    });

    const tomTat = await service.dongQuyGio('2026-02-01', 'hr1');

    expect(tomTat).toMatchObject({ soQuyDong: 1, soGioHetHan: 0, soGioChoTraTien: 0 });
    expect(quyRepo.rows[0].trangThai).toBe('da_dong');
    expect(soRepo.rows).toHaveLength(0);
  });
});

describe('QuyGio_Service.doiSoat', () => {
  it('báo lệch khi số dư không khớp sổ', async () => {
    const { service } = await dungService({
      quy: [{
        _id: 'b1', employeeId: 'nv1', kyTich: '2026-01', soGioTich: 12,
        soGioDaDung: 0, soGioDangChoDuyet: 0, soGioConLai: 12,
        hanDung: '2026-07-31', trangThai: 'dang_hieu_luc', isActive: true,
      }],
      so: [{ balanceId: 'b1', employeeId: 'nv1', kyTich: '2026-01', soGio: 8, lyDo: 'duyet_don_ot', thoiDiem: '' }],
    });

    const kq = await service.doiSoat('nv1');

    expect(kq).toEqual([
      { kyTich: '2026-01', theoSo: 8, theoSoDu: 12, lech: 4, soGioDaDong: 0 },
    ]);
  });

  it('khớp thì lệch bằng 0', async () => {
    const { service } = await dungService({
      quy: [{
        _id: 'b1', employeeId: 'nv1', kyTich: '2026-01', soGioTich: 12,
        soGioDaDung: 4, soGioDangChoDuyet: 0, soGioConLai: 8,
        hanDung: '2026-07-31', trangThai: 'dang_hieu_luc', isActive: true,
      }],
      so: [
        { balanceId: 'b1', employeeId: 'nv1', kyTich: '2026-01', soGio: 12, lyDo: 'duyet_don_ot', thoiDiem: '' },
        { balanceId: 'b1', employeeId: 'nv1', kyTich: '2026-01', soGio: -4, lyDo: 'giu_cho_nghi_bu', thoiDiem: '' },
      ],
    });

    expect((await service.doiSoat('nv1'))[0].lech).toBe(0);
  });
});

/**
 * (review nhánh, IMPORTANT 2) Làm tròn ở BIÊN. Mọi con số ở đây đều là số
 * sinh dư nhị phân thật: 4h10' × hệ số ngày nghỉ 2.0 = 8.333333333333334 —
 * đúng con số đã lọt ra tới câu "Bạn còn 8.333333333333334 giờ nghỉ bù".
 */
describe('QuyGio_Service — làm tròn giờ ở biên', () => {
  const BON_GIO_MUOI = 250 / 60; // 4h10'

  it('tichTuDonOt lưu số dư 2 chữ số, không phải 8.333333333333334', async () => {
    const { service, quyRepo, soRepo } = await dungService();

    await service.tichTuDonOt(
      donOt({ soGioOt: BON_GIO_MUOI, loaiNgayOt: 'ngay_nghi' }),
    );

    expect(quyRepo.rows[0].soGioTich).toBe(8.33);
    expect(quyRepo.rows[0].soGioConLai).toBe(8.33);
    // Sổ là nguồn sự thật của doiSoat() — nó phải tròn Y HỆT số dư, nếu
    // không thì chính doiSoat() sinh ra lệch giả.
    expect(soRepo.rows[0].soGio).toBe(8.33);
  });

  it('cộng dồn nhiều đơn lẻ vẫn giữ 2 chữ số, không trôi dần', async () => {
    const { service, quyRepo } = await dungService();

    for (const requestId of ['d1', 'd2', 'd3']) {
      await service.tichTuDonOt(
        donOt({ requestId, soGioOt: BON_GIO_MUOI, loaiNgayOt: 'ngay_nghi' }),
      );
    }

    // 8.33 × 3. Không làm tròn, ba lần `+=` cho 24.999999999999996.
    expect(quyRepo.rows[0].soGioTich).toBe(24.99);
  });

  it('soDuKhaDung trả số hiển thị được cho người dùng', async () => {
    const { service } = await dungService();
    await service.tichTuDonOt(
      donOt({ soGioOt: BON_GIO_MUOI, loaiNgayOt: 'ngay_nghi' }),
    );

    const soDu = await service.soDuKhaDung('nv1', '2026-02-01');

    expect(soDu.soGioConLai).toBe(8.33);
    expect(soDu.theoKy[0].soGioConLai).toBe(8.33);
  });

  /**
   * Đúng kịch bản mà review nhánh đo được: đơn nghỉ bù xin ĐÚNG số dư đang
   * hiển thị, trải qua ≥2 kỳ tích, bị từ chối với câu "cần X giờ, chỉ còn X
   * giờ". Ba kỳ 8.33/8.33/8.34 = 25.00 hiển thị.
   */
  it('phanBoChoNghiBu KHÔNG từ chối yêu cầu đúng bằng số dư đang hiển thị (3 kỳ)', async () => {
    const quy = [8.33, 8.33, 8.34].map((soGio, i) => ({
      _id: `b${i + 1}`,
      employeeId: 'nv1',
      kyTich: `2026-0${i + 1}`,
      soGioTich: soGio,
      soGioDaDung: 0,
      soGioDangChoDuyet: 0,
      soGioConLai: soGio,
      hanDung: `2026-1${i}-31`,
      trangThai: 'dang_hieu_luc',
      isActive: true,
    }));
    const { service } = await dungService({ quy });

    const soDu = await service.soDuKhaDung('nv1', '2026-02-01');
    expect(soDu.soGioConLai).toBe(25);

    const phanBo = await service.phanBoChoNghiBu(
      'nv1',
      soDu.soGioConLai,
      '2026-02-01',
    );
    expect(phanBo.map((p) => p.soGio)).toEqual([8.33, 8.33, 8.34]);
  });
});

/**
 * (review nhánh, IMPORTANT 3) `dongQuyGio()` ghi sổ `-conLai` nhưng CỐ Ý giữ
 * nguyên `soGioConLai` (chặng lương P4.2b còn đọc). Trước bản vá, mọi quỹ
 * ĐÃ ĐÓNG ĐÚNG đều báo `lech = soGioConLai` VĨNH VIỄN — và `ops/README.md`
 * bảo vận hành chạy đúng lệnh này sau rollout để xác nhận không lệch.
 */
describe('QuyGio_Service.doiSoat — quỹ đã đóng', () => {
  async function dungQuyDaTieuMotPhan() {
    const { service, quyRepo, soRepo } = await dungService({
      quy: [{
        _id: 'b1', employeeId: 'nv1', kyTich: '2026-01', soGioTich: 12,
        soGioDaDung: 4, soGioDangChoDuyet: 0, soGioConLai: 8,
        hanDung: '2026-01-31', trangThai: 'dang_hieu_luc', isActive: true,
      }],
      so: [
        { balanceId: 'b1', employeeId: 'nv1', kyTich: '2026-01', soGio: 12, lyDo: 'duyet_don_ot', thoiDiem: '' },
        { balanceId: 'b1', employeeId: 'nv1', kyTich: '2026-01', soGio: -4, lyDo: 'giu_cho_nghi_bu', thoiDiem: '' },
        { balanceId: 'b1', employeeId: 'nv1', kyTich: '2026-01', soGio: 0, lyDo: 'duyet_nghi_bu', thoiDiem: '' },
      ],
    });
    return { service, quyRepo, soRepo };
  }

  it('đóng quỹ xong đối soát vẫn ra lech = 0', async () => {
    const { service, quyRepo, soRepo } = await dungQuyDaTieuMotPhan();

    // Trước khi đóng: đã khớp.
    expect((await service.doiSoat('nv1'))[0].lech).toBe(0);

    await service.dongQuyGio('2026-02-01', 'hr1');

    expect(quyRepo.rows[0].trangThai).toBe('da_dong');
    // Sổ đã có thêm dòng -8 (quy_ra_tien) trong khi soGioConLai vẫn là 8.
    expect(soRepo.rows.some((d: any) => d.lyDo === 'quy_ra_tien' && d.soGio === -8)).toBe(true);

    const kq = await service.doiSoat('nv1');
    expect(kq[0]).toMatchObject({
      kyTich: '2026-01',
      theoSo: 8,
      theoSoDu: 8,
      lech: 0,
      soGioDaDong: 8,
    });
  });

  it('vẫn phát hiện được LỆCH THẬT trên quỹ đã đóng', async () => {
    const { service, quyRepo } = await dungQuyDaTieuMotPhan();
    await service.dongQuyGio('2026-02-01', 'hr1');

    // Mô phỏng đúng lớp bug mà doiSoat() sinh ra để bắt: có nơi nào đó ghi
    // số dư mà quên ghi sổ.
    quyRepo.rows[0].soGioConLai = 11;

    expect((await service.doiSoat('nv1'))[0].lech).toBe(3);
  });

  it('quỹ huy_bo (không quy ra tiền) cũng đối soát về 0', async () => {
    const { service } = await dungService({
      cauHinh: {
        soGioMoiNgay: 8,
        lamThem: {
          cheDoBu: 'chi_nghi_bu',
          heSoTichQuy: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 3 },
          soThangHanDung: 6,
          khiHetHan: 'huy_bo',
        },
      },
      quy: [{
        _id: 'b1', employeeId: 'nv1', kyTich: '2026-01', soGioTich: 6,
        soGioDaDung: 0, soGioDangChoDuyet: 0, soGioConLai: 6,
        hanDung: '2026-01-31', trangThai: 'dang_hieu_luc', isActive: true,
      }],
      so: [
        { balanceId: 'b1', employeeId: 'nv1', kyTich: '2026-01', soGio: 6, lyDo: 'duyet_don_ot', thoiDiem: '' },
      ],
    });

    await service.dongQuyGio('2026-02-01', 'hr1');

    expect((await service.doiSoat('nv1'))[0]).toMatchObject({
      lech: 0,
      soGioDaDong: 6,
    });
  });
});

/**
 * (review nhánh, IMPORTANT 5) Cờ `chiPhanDaGiuCuaDon` của `nhaCho()` — chỉ
 * đường BÙ trong `don-cham-cong.service.ts` dùng tới. Nó tồn tại vì
 * `soGioDangChoDuyet` là bộ đếm DÙNG CHUNG theo quỹ, không tách theo đơn.
 */
describe('QuyGio_Service.nhaCho — chiPhanDaGiuCuaDon', () => {
  const haiKy = () => [
    {
      _id: 'b1', employeeId: 'nv1', kyTich: '2026-01', soGioTich: 4,
      soGioDaDung: 0, soGioDangChoDuyet: 2, soGioConLai: 2,
      hanDung: '2026-07-31', trangThai: 'dang_hieu_luc', isActive: true,
    },
    {
      // Chỗ giữ này thuộc về một đơn KHÁC — không có dòng sổ nào của 'donA'.
      _id: 'b2', employeeId: 'nv1', kyTich: '2026-02', soGioTich: 2,
      soGioDaDung: 0, soGioDangChoDuyet: 2, soGioConLai: 0,
      hanDung: '2026-08-31', trangThai: 'dang_hieu_luc', isActive: true,
    },
  ];
  const phanBo = [
    { balanceId: 'b1', kyTich: '2026-01', soGio: 2 },
    { balanceId: 'b2', kyTich: '2026-02', soGio: 1 },
  ];
  // Sổ: donA đã giữ chỗ THÀNH CÔNG ở kỳ 1, chưa từng chạm kỳ 2.
  const soDaGiuKy1 = [
    {
      balanceId: 'b1', employeeId: 'nv1', kyTich: '2026-01', soGio: -2,
      lyDo: 'giu_cho_nghi_bu', requestId: 'donA', thoiDiem: '',
    },
  ];

  it('true: chỉ nhả kỳ có dòng sổ giữ chỗ của ĐÚNG đơn này', async () => {
    const { service, quyRepo } = await dungService({
      quy: haiKy(), so: [...soDaGiuKy1],
    });

    await service.nhaCho('nv1', phanBo, 'donA', 'hr1', true);

    expect(quyRepo.rows[0].soGioDangChoDuyet).toBe(0); // kỳ 1: nhả
    expect(quyRepo.rows[1].soGioDangChoDuyet).toBe(2); // kỳ 2: KHÔNG đụng
  });

  it('mặc định (false) nhả mù cả hai kỳ — ăn vào chỗ giữ của đơn khác', async () => {
    const { service, quyRepo } = await dungService({
      quy: haiKy(), so: [...soDaGiuKy1],
    });

    await service.nhaCho('nv1', phanBo, 'donA', 'hr1');

    expect(quyRepo.rows[0].soGioDangChoDuyet).toBe(0);
    // Chốt lại hành vi CŨ là có thật (2 - 1 = 1) — đây đúng là lý do đường
    // BÙ phải bật cờ, còn các đường nghiệp vụ bình thường (từ chối/tự
    // huỷ/xoá đơn) thì KHÔNG, vì ở đó ta biết chắc đơn này đã giữ đủ.
    expect(quyRepo.rows[1].soGioDangChoDuyet).toBe(1);
  });
});

describe('giữ chỗ nguyên tử (P4.2b Task 1)', () => {
  const quyDay = () => [
    {
      _id: 'b1', employeeId: 'nv1', kyTich: '2026-01', soGioTich: 10,
      soGioDaDung: 0, soGioDangChoDuyet: 0, soGioConLai: 10,
      hanDung: '2026-07-31', trangThai: 'dang_hieu_luc',
    },
  ];

  it('ghi qua findOneAndUpdate chứ không qua save()', async () => {
    const { service, quyRepo } = await dungService({ quy: quyDay() });

    await service.giuCho(
      'nv1', [{ balanceId: 'b1', kyTich: '2026-01', soGio: 4 }], 'don1', 'nv1',
    );

    expect(quyRepo.findOneAndUpdate).toHaveBeenCalled();
    expect(quyRepo.save).not.toHaveBeenCalled();
    expect(quyRepo.rows[0].soGioDangChoDuyet).toBe(4);
    expect(quyRepo.rows[0].soGioConLai).toBe(6);
  });

  it('CAS trượt thì đọc lại và tính lại trên số dư MỚI', async () => {
    const { service, quyRepo } = await dungService({ quy: quyDay() });

    // Mô phỏng một đơn KHÁC vừa giữ 8 giờ ngay giữa lúc ta đọc và lúc ta ghi:
    // lần findOneAndUpdate đầu trượt, và khi ta đọc lại thì số dư đã bị ăn.
    const that = quyRepo.findOneAndUpdate;
    let lanDau = true;
    quyRepo.manager.getMongoRepository = () => ({
      findOneAndUpdate: async (filter: any, update: any, opts: any) => {
        if (lanDau) {
          lanDau = false;
          quyRepo.rows[0].soGioDangChoDuyet = 8;
          quyRepo.rows[0].soGioConLai = 2;
          return null; // filter không còn khớp
        }
        return that(filter, update, opts);
      },
    });

    await expect(
      service.giuCho(
        'nv1', [{ balanceId: 'b1', kyTich: '2026-01', soGio: 4 }], 'don1', 'nv1',
      ),
    ).rejects.toMatchObject({ response: { code: 'QUY_GIO_KHONG_DU_SO_DU' } });

    // Không có 12/10 giờ nào bị giữ — đúng phần đơn kia đã giữ và không hơn.
    expect(quyRepo.rows[0].soGioDangChoDuyet).toBe(8);
  });

  it('CAS trượt mãi thì bỏ cuộc bằng mã lỗi riêng, không treo vòng lặp', async () => {
    const { service, quyRepo } = await dungService({ quy: quyDay() });

    quyRepo.manager.getMongoRepository = () => ({
      findOneAndUpdate: async () => null, // luôn trượt
    });

    await expect(
      service.giuCho(
        'nv1', [{ balanceId: 'b1', kyTich: '2026-01', soGio: 4 }], 'don1', 'nv1',
      ),
    ).rejects.toMatchObject({
      response: { code: 'QUY_GIO_DANG_SUA_DONG_THOI' },
    });

    expect(quyRepo.rows[0].soGioDangChoDuyet).toBe(0);
  });
});
