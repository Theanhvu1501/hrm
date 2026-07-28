import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { LeaveBalance, LeaveBalanceEntry, Employee } from '@app/entities';
import { QuyPhep_Service } from './quy-phep.service';

/** Repo giả tối thiểu: đủ find/findOne/save/create cho service này. */
function taoRepoGia<T extends { _id?: any }>(banDau: T[] = []) {
  const kho: any[] = [...banDau];
  let seq = 0;
  return {
    kho,
    create: (x: any) => ({ ...x }),
    save: async (x: any) => {
      if (!x._id) {
        seq += 1;
        x._id = { toString: () => `id${seq}` };
        kho.push(x);
        return x;
      }
      // Cập nhật: thay đúng phần tử trong kho theo _id thay vì im lặng không
      // làm gì. Trước đây nhánh này là no-op và test vẫn "qua" — nhưng chỉ vì
      // find/findOne trả thẳng tham chiếu nằm sẵn trong `kho`, nên service
      // mutate tại chỗ tình cờ trùng với bản ghi test đang giữ. Bất kỳ chỗ nào
      // service dựng lại object rồi save() (repo.create() trả object mới, hay
      // findOne trả bản sao) sẽ khiến update biến mất mà test không hề biết —
      // đúng cái bẫy mà Task 4 review đã chỉ ra.
      const idx = kho.findIndex((y) => String(y._id) === String(x._id));
      if (idx === -1) kho.push(x);
      else kho[idx] = x;
      return x;
    },
    // Trả BẢN SAO NÔNG, không trả tham chiếu sống trong `kho`. Nếu trả thẳng
    // tham chiếu, service có thể mutate object rồi QUÊN gọi `save()` mà mọi
    // test vẫn xanh — vì bản ghi trong `kho` đã bị sửa "tình cờ" qua chung
    // tham chiếu đó. Bản sao nông buộc mọi thay đổi phải đi qua `save()` mới
    // phản ánh vào `kho`, đúng như một repo TypeORM thật (find/findOne không
    // trả entity đang được ORM theo dõi tại chỗ để tự ý sửa).
    find: async ({ where }: any = {}) =>
      kho
        .filter((x) =>
          Object.entries(where ?? {}).every(([k, v]) => (x as any)[k] === v),
        )
        .map((x) => ({ ...x })),
    findOne: async ({ where }: any) => {
      const x = kho.find((x) =>
        Object.entries(where ?? {}).every(([k, v]) => String((x as any)[k]) === String(v)),
      );
      return x ? { ...x } : null;
    },
  };
}

// ID trong test PHẢI là chuỗi hex 24 ký tự: service dùng `new ObjectId(id)`
// (findOne theo _id), và ObjectId('nv1') ném BSONError chứ không trả null.
const ID_NV1 = '650000000000000000000001';
const ID_NV2 = '650000000000000000000002';

const NV_CHINH_THUC = {
  _id: { toString: () => ID_NV1 },
  employeeId: 'NV0001',
  hoTen: 'Nguyễn Văn A',
  ngayVaoLam: '2026-08-01',
  ngayChinhThuc: '2026-10-01',
  ngayLamViecTrongTuan: [1, 2, 3, 4, 5, 6],
  trangThai: 'dang_lam_viec',
  isActive: true,
};

const NV_THU_VIEC = {
  _id: { toString: () => ID_NV2 },
  employeeId: 'NV0002',
  hoTen: 'Trần Thị B',
  ngayVaoLam: '2026-11-01',
  ngayLamViecTrongTuan: [1, 2, 3, 4, 5, 6],
  trangThai: 'dang_lam_viec',
  isActive: true,
};

async function dungService(nhanVien: any[] = [NV_CHINH_THUC, NV_THU_VIEC]) {
  const repoQuy = taoRepoGia<any>();
  const repoSo = taoRepoGia<any>();
  const repoNv = taoRepoGia<any>(nhanVien);
  const moduleRef = await Test.createTestingModule({
    providers: [
      QuyPhep_Service,
      { provide: getRepositoryToken(LeaveBalance), useValue: repoQuy },
      { provide: getRepositoryToken(LeaveBalanceEntry), useValue: repoSo },
      { provide: getRepositoryToken(Employee), useValue: repoNv },
    ],
  }).compile();
  return { service: moduleRef.get(QuyPhep_Service), repoQuy, repoSo };
}

describe('QuyPhep_Service — cấp phép', () => {
  it('cấp đầu năm bỏ qua người còn thử việc', async () => {
    const { service, repoQuy } = await dungService();
    const ketQua = await service.capPhepDauNam(2027, 'hr1');
    expect(ketQua.daCap).toBe(1);
    expect(ketQua.boQua).toBe(1);
    expect(repoQuy.kho).toHaveLength(1);
    expect(repoQuy.kho[0].employeeId).toBe(ID_NV1);
    expect(repoQuy.kho[0].soNgayDuocCap).toBe(12);
    expect(repoQuy.kho[0].hanDung).toBe('2028-03-31');
  });

  it('cấp đầu năm chạy lần hai không cấp trùng', async () => {
    const { service, repoQuy } = await dungService();
    await service.capPhepDauNam(2027, 'hr1');
    const lanHai = await service.capPhepDauNam(2027, 'hr1');
    expect(lanHai.daCap).toBe(0);
    expect(repoQuy.kho).toHaveLength(1);
  });

  it('mở khoá lên chính thức — ca A cấp đúng 5 ngày cho năm vào làm', async () => {
    const { service, repoQuy, repoSo } = await dungService([NV_CHINH_THUC]);
    const quy = await service.moKhoaLenChinhThuc(ID_NV1, 'hr1');
    expect(quy).toHaveLength(1);
    expect(repoQuy.kho[0].nam).toBe(2026);
    expect(repoQuy.kho[0].soNgayDuocCap).toBe(5);
    expect(repoQuy.kho[0].soNgayConLai).toBe(5);
    expect(repoSo.kho[0].lyDo).toBe('cap_len_chinh_thuc');
    expect(repoSo.kho[0].soNgay).toBe(5);
  });

  it('ca D — lên chính thức năm sau thì CẤP BÙ quỹ năm trước, không bỏ rơi', async () => {
    const { service, repoQuy } = await dungService([
      { ...NV_THU_VIEC, ngayVaoLam: '2026-11-20', ngayChinhThuc: '2027-01-15' },
    ]);
    await service.moKhoaLenChinhThuc(ID_NV2, 'hr1');
    const theoNam = Object.fromEntries(
      repoQuy.kho.map((q: any) => [q.nam, q.soNgayDuocCap]),
    );
    expect(theoNam).toEqual({ 2026: 1, 2027: 12 });
    expect(repoQuy.kho.find((q: any) => q.nam === 2026).hanDung).toBe('2027-03-31');
  });

  it('mở khoá lần hai không cấp thêm', async () => {
    const { service, repoQuy } = await dungService([NV_CHINH_THUC]);
    await service.moKhoaLenChinhThuc(ID_NV1, 'hr1');
    await service.moKhoaLenChinhThuc(ID_NV1, 'hr1');
    expect(repoQuy.kho).toHaveLength(1);
  });

  it('người chưa có ngayChinhThuc thì mở khoá không tạo quỹ nào', async () => {
    const { service, repoQuy } = await dungService([NV_THU_VIEC]);
    const quy = await service.moKhoaLenChinhThuc(ID_NV2, 'hr1');
    expect(quy).toEqual([]);
    expect(repoQuy.kho).toHaveLength(0);
  });
});

const ID_Q2026 = '6500000000000000000000a1';
const ID_Q2027 = '6500000000000000000000a2';

function quyGia(id: string, nam: number, soNgay: number, hanDung: string) {
  return {
    _id: { toString: () => id },
    employeeId: ID_NV1,
    nam,
    loaiQuy: 'phep_nam',
    soNgayDuocCap: soNgay,
    soNgayDaDung: 0,
    soNgayDangChoDuyet: 0,
    soNgayConLai: soNgay,
    hanDung,
    trangThai: 'dang_hieu_luc',
    isActive: true,
  };
}

/** Dựng sẵn 2 quỹ: 2026 còn 3 ngày (hạn 31/3/2027) và 2027 còn 12 ngày. */
async function dungHaiQuy() {
  const ctx = await dungService([NV_CHINH_THUC]);
  ctx.repoQuy.kho.push(
    quyGia(ID_Q2026, 2026, 3, '2027-03-31'),
    quyGia(ID_Q2027, 2027, 12, '2028-03-31'),
  );
  return ctx;
}

/**
 * CHỈ có quỹ 2026 (3 ngày). Cần cho các test "hết phép": nếu còn quỹ 2027 thì
 * FIFO tràn sang quỹ đó và không bao giờ chạm được nhánh không đủ số dư.
 */
async function dungMotQuy() {
  const ctx = await dungService([NV_CHINH_THUC]);
  ctx.repoQuy.kho.push(quyGia(ID_Q2026, 2026, 3, '2027-03-31'));
  return ctx;
}

describe('QuyPhep_Service — phân bổ FIFO', () => {
  it('trừ quỹ năm cũ trước khi động tới quỹ năm mới', async () => {
    const { service } = await dungHaiQuy();
    const phanBo = await service.phanBoChoNgayNghi(
      ID_NV1,
      ['2027-02-01', '2027-02-02'],
      2,
    );
    expect(phanBo).toEqual([{ balanceId: ID_Q2026, nam: 2026, soNgay: 2 }]);
  });

  it('đơn vắt qua 31/3 chia đúng hai quỹ theo TỪNG NGÀY', async () => {
    const { service } = await dungHaiQuy();
    const phanBo = await service.phanBoChoNgayNghi(
      ID_NV1,
      ['2027-03-30', '2027-03-31', '2027-04-01', '2027-04-02'],
      4,
    );
    expect(phanBo).toEqual([
      { balanceId: ID_Q2026, nam: 2026, soNgay: 2 },
      { balanceId: ID_Q2027, nam: 2027, soNgay: 2 },
    ]);
  });

  it('ngày nghỉ sau hạn dùng KHÔNG ăn được quỹ cũ dù quỹ cũ còn dư', async () => {
    const { service } = await dungHaiQuy();
    const phanBo = await service.phanBoChoNgayNghi(ID_NV1, ['2027-04-01'], 1);
    expect(phanBo).toEqual([{ balanceId: ID_Q2027, nam: 2027, soNgay: 1 }]);
  });

  it('nửa ngày trừ 0.5 vào quỹ của đúng ngày đó', async () => {
    const { service } = await dungHaiQuy();
    const phanBo = await service.phanBoChoNgayNghi(ID_NV1, ['2027-02-01'], 0.5);
    expect(phanBo).toEqual([{ balanceId: ID_Q2026, nam: 2026, soNgay: 0.5 }]);
  });

  it('không đủ số dư → ConflictException mã KHONG_DU_SO_DU', async () => {
    const { service } = await dungMotQuy();
    await expect(
      service.phanBoChoNgayNghi(
        ID_NV1,
        ['2027-02-01', '2027-02-02', '2027-02-03', '2027-02-04'],
        4,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('quỹ đã đóng không được dùng dù chưa quá hạn', async () => {
    const { service, repoQuy } = await dungHaiQuy();
    repoQuy.kho[0].trangThai = 'da_dong';
    const phanBo = await service.phanBoChoNgayNghi(ID_NV1, ['2027-02-01'], 1);
    expect(phanBo).toEqual([{ balanceId: ID_Q2027, nam: 2027, soNgay: 1 }]);
  });
});

describe('QuyPhep_Service — vòng đời giữ chỗ', () => {
  const PHAN_BO = [{ balanceId: ID_Q2026, nam: 2026, soNgay: 2 }];

  it('giữ chỗ làm giảm số dư khả dụng ngay, chưa tính là đã dùng', async () => {
    const { service, repoQuy } = await dungHaiQuy();
    await service.giuCho(ID_NV1, PHAN_BO, 'don1', 'nv1');
    const q = repoQuy.kho.find((x: any) => x.nam === 2026);
    expect(q.soNgayDangChoDuyet).toBe(2);
    expect(q.soNgayDaDung).toBe(0);
    expect(q.soNgayConLai).toBe(1);
  });

  // Kịch bản spec §6.2: quỹ 3 ngày, đơn 1 giữ chỗ 2 ngày ⇒ đơn 2 xin 2 ngày
  // phải bị chặn NGAY LÚC NỘP, không đợi HR duyệt tới đơn thứ hai mới phát
  // hiện âm quỹ. Dùng dungMotQuy(): còn quỹ 2027 thì FIFO tràn sang và test
  // không kiểm được gì.
  it('đơn thứ hai bị chặn vì đơn thứ nhất đang giữ chỗ', async () => {
    const { service } = await dungMotQuy();
    const p1 = await service.phanBoChoNgayNghi(
      ID_NV1,
      ['2027-02-01', '2027-02-02'],
      2,
    );
    await service.giuCho(ID_NV1, p1, 'don1', ID_NV1);
    await expect(
      service.phanBoChoNgayNghi(ID_NV1, ['2027-02-03', '2027-02-04'], 2),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('duyệt: chuyển giữ chỗ thành đã dùng, ghi đúng 1 dòng sổ duyet_don', async () => {
    const { service, repoQuy, repoSo } = await dungHaiQuy();
    await service.giuCho(ID_NV1, PHAN_BO, 'don1', 'nv1');
    // giuCho KHÔNG được ghi sổ: nếu nó có ghi, mốc `truocDuyet` dưới đây đã
    // nuốt mất dòng đó và phép trừ (length - truocDuyet) vẫn ra 1 cho dù
    // giuCho có ghi lố. Khẳng định thẳng sổ còn sạch trước khi tính mốc.
    expect(repoSo.kho).toHaveLength(0);
    const truocDuyet = repoSo.kho.length;
    await service.chuyenSangDaDung(ID_NV1, PHAN_BO, 'don1', 'hr1');
    const q = repoQuy.kho.find((x: any) => x.nam === 2026);
    expect(q.soNgayDangChoDuyet).toBe(0);
    expect(q.soNgayDaDung).toBe(2);
    expect(q.soNgayConLai).toBe(1);
    expect(repoSo.kho.length - truocDuyet).toBe(1);
    expect(repoSo.kho.at(-1)).toMatchObject({
      lyDo: 'duyet_don',
      requestId: 'don1',
      soNgay: -2, // âm = trừ khỏi quỹ; doiSoat() của Task 6 dựa vào dấu này
    });
  });

  it('từ chối: quỹ trở về đúng như trước khi nộp', async () => {
    const { service, repoQuy } = await dungHaiQuy();
    await service.giuCho(ID_NV1, PHAN_BO, 'don1', 'nv1');
    await service.nhaCho(ID_NV1, PHAN_BO, 'don1', 'hr1');
    const q = repoQuy.kho.find((x: any) => x.nam === 2026);
    expect(q.soNgayDangChoDuyet).toBe(0);
    expect(q.soNgayConLai).toBe(3);
  });

  it('huỷ đơn ĐÃ DUYỆT hoàn về đúng quỹ cũ, kể cả quỹ đã đóng', async () => {
    const { service, repoQuy, repoSo } = await dungHaiQuy();
    await service.giuCho(ID_NV1, PHAN_BO, 'don1', 'nv1');
    await service.chuyenSangDaDung(ID_NV1, PHAN_BO, 'don1', 'hr1');
    repoQuy.kho.find((x: any) => x.nam === 2026).trangThai = 'da_dong';

    await service.hoanTraDaDung(ID_NV1, PHAN_BO, 'don1', 'hr1');

    const q2026 = repoQuy.kho.find((x: any) => x.nam === 2026);
    const q2027 = repoQuy.kho.find((x: any) => x.nam === 2027);
    expect(q2026.soNgayDaDung).toBe(0);
    // Recompute phải chạy lại trong ghi(): nếu không, quỹ có thể kẹt ở
    // daDung = 0 nhưng conLai vẫn = 1 (như lúc mới duyệt) — NV mất im lặng
    // 2 ngày dùng được dù sổ đã ghi hoàn.
    expect(q2026.soNgayConLai).toBe(3);
    expect(q2027.soNgayDuocCap).toBe(12); // KHÔNG chảy sang quỹ mới
    expect(repoSo.kho.at(-1)).toMatchObject({ lyDo: 'huy_don', soNgay: 2 });
  });

  it('hoàn lần hai không ghi thêm dòng sổ và không cộng nhầm số dư (idempotent)', async () => {
    const { service, repoQuy, repoSo } = await dungHaiQuy();
    await service.giuCho(ID_NV1, PHAN_BO, 'don1', 'nv1');
    await service.chuyenSangDaDung(ID_NV1, PHAN_BO, 'don1', 'hr1');

    await service.hoanTraDaDung(ID_NV1, PHAN_BO, 'don1', 'hr1');
    await service.hoanTraDaDung(ID_NV1, PHAN_BO, 'don1', 'hr1'); // bấm lần hai / retry

    const soHuyDon = repoSo.kho.filter((x: any) => x.lyDo === 'huy_don');
    expect(soHuyDon).toHaveLength(1);
    const q2026 = repoQuy.kho.find((x: any) => x.nam === 2026);
    expect(q2026.soNgayDaDung).toBe(0);
    expect(q2026.soNgayConLai).toBe(3);
  });

  it('duyệt lần hai cho cùng một đơn bị chặn, quỹ không bao giờ âm', async () => {
    const { service, repoQuy } = await dungHaiQuy();
    await service.giuCho(ID_NV1, PHAN_BO, 'don1', 'nv1');
    await service.chuyenSangDaDung(ID_NV1, PHAN_BO, 'don1', 'hr1');

    await expect(
      service.chuyenSangDaDung(ID_NV1, PHAN_BO, 'don1', 'hr1'), // bấm lần hai / retry
    ).rejects.toBeInstanceOf(ConflictException);

    const q2026 = repoQuy.kho.find((x: any) => x.nam === 2026);
    expect(q2026.soNgayDaDung).toBe(2); // không tăng lên 4
    expect(q2026.soNgayConLai).toBe(1); // không âm
  });

  it('phanBoQuy trỏ sang quỹ của nhân viên khác bị chặn', async () => {
    const { service } = await dungHaiQuy();
    await expect(
      service.giuCho(ID_NV2, PHAN_BO, 'don1', ID_NV2),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
