import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OvertimeBalance, OvertimeBalanceEntry, CauHinhLuong } from '@app/entities';
import { QuyGio_Service } from './quy-gio.service';

// Repo giả tối thiểu: giữ mảng trong bộ nhớ, đủ để kiểm luật cộng trừ và sổ.
function repoGia(khoiTao: any[] = []) {
  const rows = [...khoiTao];
  return {
    rows,
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
  // nhaCho/hoanTraDaDung KHÔNG có guard tương ứng (xem doc-comment service) —
  // không test chống trùng cho hai hàm đó ở đây, cố ý.
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
});
