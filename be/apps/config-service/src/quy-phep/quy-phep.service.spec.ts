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
        // PHẢI là hex 24 ký tự hợp lệ: `layQuyTheoId` (Task 5) gọi thẳng
        // `new ObjectId(balanceId)` trên id lấy từ đây khi test đi theo
        // đường "tạo quỹ qua service rồi đưa id đó vào giuCho/…" (Task 6).
        // Id giả dạng `id1` từng đủ vì trước đó không test nào route ngược
        // id vừa tạo qua ObjectId — nay `doiSoat` làm vậy nên phải hex thật.
        x._id = { toString: () => seq.toString(16).padStart(24, '0') };
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

  // P3.8 fix round 2: trước đây `chuyenSangDaDung` lần hai NÉM
  // ConflictException để tự chặn trùng. Từ fix round 2, `updateStatus()`
  // (don-cham-cong.service.ts) có thể tự khôi phục đơn về `cho_duyet` sau
  // một lần duyệt hỏng giữa chừng (đơn phân bổ ≥2 quỹ) rồi để HR bấm duyệt
  // LẠI — nghĩa là "duyệt lần hai" giờ là một tình huống HỢP LỆ, không phải
  // lỗi. `chuyenSangDaDung` vì vậy đổi từ "ném lỗi để chặn" sang "tự chống
  // trùng qua sổ" (`daGhiChoDon`) — lần gọi lại thấy đã có dòng sổ
  // `duyet_don` đúng requestId thì ÂM THẦM bỏ qua quỹ đó, không ném, không
  // trừ thêm. Quỹ vẫn không bao giờ âm, chỉ khác ở CHỖ chặn.
  it('duyệt lần hai cho cùng một đơn (idempotent) → không trừ thêm, sổ không nhân đôi', async () => {
    const { service, repoQuy, repoSo } = await dungHaiQuy();
    await service.giuCho(ID_NV1, PHAN_BO, 'don1', 'nv1');
    await service.chuyenSangDaDung(ID_NV1, PHAN_BO, 'don1', 'hr1');

    await service.chuyenSangDaDung(ID_NV1, PHAN_BO, 'don1', 'hr1'); // bấm lần hai / retry — KHÔNG ném nữa

    const q2026 = repoQuy.kho.find((x: any) => x.nam === 2026);
    expect(q2026.soNgayDaDung).toBe(2); // không tăng lên 4
    expect(q2026.soNgayConLai).toBe(1); // không âm
    expect(
      repoSo.kho.filter(
        (x: any) => x.lyDo === 'duyet_don' && x.balanceId === ID_Q2026,
      ),
    ).toHaveLength(1); // đúng 1 dòng sổ, không nhân đôi
  });

  // Kịch bản review round 2 nêu để biện minh cho fix: đơn vắt qua 31/3 nên
  // phanBoQuy có 2 phần tử (quỹ 2026 + quỹ 2027). HR dieuChinhTay một số âm
  // lên quỹ THỨ HAI giữa lúc nộp và lúc duyệt — chuyenSangDaDung áp dụng
  // xong quỹ 1 (ghi sổ duyet_don) rồi mới ném ở quỹ 2 (thiếu số dư). Test
  // này xác nhận: (a) quỹ 1 KHÔNG bị trừ lần hai khi thử lại sau khi HR sửa
  // lại số dư, (b) sổ duyet_don của quỹ 1 vẫn chỉ có đúng 1 dòng.
  it('duyệt hỏng ở quỹ thứ hai (HR giảm nhầm số dư giữa lúc nộp và lúc duyệt) → quỹ thứ nhất KHÔNG bị trừ lần hai khi thử lại', async () => {
    const { service, repoQuy, repoSo } = await dungHaiQuy();
    const phanBoHaiQuy = [
      { balanceId: ID_Q2026, nam: 2026, soNgay: 2 },
      { balanceId: ID_Q2027, nam: 2027, soNgay: 10 },
    ];
    await service.giuCho(ID_NV1, phanBoHaiQuy, 'don1', 'nv1');

    // HR giảm nhầm số dư quỹ 2027 SAU khi đã giữ chỗ, TRƯỚC khi duyệt: 12 → 7.
    await service.dieuChinhTay(ID_NV1, ID_Q2027, -5, 'giảm nhầm', 'hr1');

    await expect(
      service.chuyenSangDaDung(ID_NV1, phanBoHaiQuy, 'don1', 'hr1'),
    ).rejects.toBeInstanceOf(ConflictException);

    // Quỹ 2026 (phần tử ĐẦU trong phanBo) đã được áp dụng thành công TRƯỚC
    // khi hỏng ở quỹ 2027 — vòng lặp không nguyên tử.
    const q2026SauLanMot = repoQuy.kho.find((x: any) => x.nam === 2026);
    expect(q2026SauLanMot.soNgayDaDung).toBe(2);
    expect(
      repoSo.kho.filter((x: any) => x.lyDo === 'duyet_don'),
    ).toHaveLength(1);

    // HR sửa lại số dư quỹ 2027 cho đủ (7 → 12) rồi bấm duyệt LẠI — retry.
    await service.dieuChinhTay(ID_NV1, ID_Q2027, 5, 'sửa lại cho đúng', 'hr1');
    await service.chuyenSangDaDung(ID_NV1, phanBoHaiQuy, 'don1', 'hr1');

    const q2026Sau = repoQuy.kho.find((x: any) => x.nam === 2026);
    const q2027Sau = repoQuy.kho.find((x: any) => x.nam === 2027);
    // Quỹ 2026 KHÔNG bị trừ lần hai (vẫn 2, không phải 4).
    expect(q2026Sau.soNgayDaDung).toBe(2);
    // Quỹ 2027 giờ mới thực sự được áp dụng.
    expect(q2027Sau.soNgayDaDung).toBe(10);
    // Sổ duyet_don: đúng 1 dòng cho MỖI balanceId, quỹ 2026 không nhân đôi.
    const soDuyetDon = repoSo.kho.filter((x: any) => x.lyDo === 'duyet_don');
    expect(
      soDuyetDon.filter((x: any) => x.balanceId === ID_Q2026),
    ).toHaveLength(1);
    expect(
      soDuyetDon.filter((x: any) => x.balanceId === ID_Q2027),
    ).toHaveLength(1);
  });

  // hoanTraDaDung song sinh với chuyenSangDaDung — cùng cơ chế daGhiChoDon,
  // xác nhận hoạt động khi phanBo có nhiều phần tử.
  it('hoàn lần hai cho cùng một đơn (idempotent, nhiều quỹ) → mỗi quỹ chỉ hoàn một lần, sổ không nhân đôi', async () => {
    const { service, repoQuy, repoSo } = await dungHaiQuy();
    const phanBoHaiQuy = [
      { balanceId: ID_Q2026, nam: 2026, soNgay: 2 },
      { balanceId: ID_Q2027, nam: 2027, soNgay: 5 },
    ];
    await service.giuCho(ID_NV1, phanBoHaiQuy, 'don1', 'nv1');
    await service.chuyenSangDaDung(ID_NV1, phanBoHaiQuy, 'don1', 'hr1');

    await service.hoanTraDaDung(ID_NV1, phanBoHaiQuy, 'don1', 'hr1');
    await service.hoanTraDaDung(ID_NV1, phanBoHaiQuy, 'don1', 'hr1'); // bấm lần hai / retry

    const q2026 = repoQuy.kho.find((x: any) => x.nam === 2026);
    const q2027 = repoQuy.kho.find((x: any) => x.nam === 2027);
    expect(q2026.soNgayDaDung).toBe(0);
    expect(q2027.soNgayDaDung).toBe(0);
    const soHuyDon = repoSo.kho.filter((x: any) => x.lyDo === 'huy_don');
    expect(soHuyDon.filter((x: any) => x.balanceId === ID_Q2026)).toHaveLength(1);
    expect(soHuyDon.filter((x: any) => x.balanceId === ID_Q2027)).toHaveLength(1);
  });

  it('phanBoQuy trỏ sang quỹ của nhân viên khác bị chặn', async () => {
    const { service } = await dungHaiQuy();
    await expect(
      service.giuCho(ID_NV2, PHAN_BO, 'don1', ID_NV2),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('QuyPhep_Service — điều chỉnh, đóng quỹ, đối soát', () => {
  it('điều chỉnh tay bắt buộc có ghi chú', async () => {
    const { service } = await dungHaiQuy();
    await expect(
      service.dieuChinhTay(ID_NV1, ID_Q2026, -1, '', 'hr1'),
    ).rejects.toThrow();
  });

  it('điều chỉnh tay đổi số dư và ghi sổ dieu_chinh_tay', async () => {
    const { service, repoQuy, repoSo } = await dungHaiQuy();
    await service.dieuChinhTay(
      ID_NV1,
      ID_Q2026,
      2,
      'Bù phép năm ngoái theo QĐ 12',
      'hr1',
    );
    const q = repoQuy.kho.find((x: any) => x.nam === 2026);
    expect(q.soNgayDuocCap).toBe(5);
    expect(q.soNgayConLai).toBe(5);
    expect(repoSo.kho.at(-1)).toMatchObject({
      lyDo: 'dieu_chinh_tay',
      soNgay: 2,
      ghiChu: 'Bù phép năm ngoái theo QĐ 12',
    });
  });

  it('xem trước đóng quỹ liệt kê đúng số ngày sắp mất', async () => {
    const { service } = await dungHaiQuy();
    const xemTruoc = await service.xemTruocDongQuy(2026);
    expect(xemTruoc).toEqual([
      expect.objectContaining({ balanceId: ID_Q2026, soNgayMat: 3 }),
    ]);
  });

  it('đóng quỹ ghi sổ het_han đúng số dư và khoá quỹ lại', async () => {
    const { service, repoQuy, repoSo } = await dungHaiQuy();
    const ketQua = await service.dongQuy(2026, 'hr1');
    expect(ketQua).toEqual({ soQuyDaDong: 1, tongNgayMat: 3 });
    const q = repoQuy.kho.find((x: any) => x.nam === 2026);
    expect(q.trangThai).toBe('da_dong');
    expect(q.soNgayConLai).toBe(0);
    expect(repoSo.kho.at(-1)).toMatchObject({ lyDo: 'het_han', soNgay: -3 });
  });

  it('đóng quỹ lần hai không ghi thêm dòng sổ nào', async () => {
    const { service, repoSo } = await dungHaiQuy();
    await service.dongQuy(2026, 'hr1');
    const sau = repoSo.kho.length;
    const lanHai = await service.dongQuy(2026, 'hr1');
    expect(lanHai.soQuyDaDong).toBe(0);
    expect(repoSo.kho.length).toBe(sau);
  });

  it('đối soát khớp sau chuỗi thao tác hỗn hợp', async () => {
    const { service } = await dungService([NV_CHINH_THUC]);
    await service.moKhoaLenChinhThuc(ID_NV1, 'hr1');
    const [quy] = await service.layQuyCuaNhanVien(ID_NV1);
    const id = String((quy as any)._id);

    const phanBo = [{ balanceId: id, nam: 2026, soNgay: 2 }];
    await service.giuCho(ID_NV1, phanBo, 'don1', 'nv1');
    await service.chuyenSangDaDung(ID_NV1, phanBo, 'don1', 'hr1');
    await service.hoanTraDaDung(ID_NV1, phanBo, 'don1', 'hr1');
    await service.dieuChinhTay(ID_NV1, id, -1, 'Nghỉ không lương quá 1 tháng', 'hr1');

    expect(await service.doiSoat(ID_NV1)).toEqual([]);
  });

  it('đối soát PHÁT HIỆN được số dư bị sửa lén không qua sổ', async () => {
    const { service, repoQuy } = await dungService([NV_CHINH_THUC]);
    await service.moKhoaLenChinhThuc(ID_NV1, 'hr1');
    repoQuy.kho[0].soNgayDuocCap = 99; // ai đó ghi thẳng vào quỹ, không ghi sổ

    const lech = await service.doiSoat(ID_NV1);
    expect(lech).toHaveLength(1);
    expect(lech[0]).toMatchObject({ theoSo: 5, theoQuy: 99 });
  });

  // Ca đặc biệt: quỹ đã ĐÓNG rồi mới nhận hoàn trả (đơn đã duyệt trước lúc
  // đóng bị huỷ SAU khi đóng). hoanTraDaDung() hoàn về ĐÚNG quỹ gốc theo thiết
  // kế, kể cả quỹ da_dong — nên quỹ này có soNgayConLai > 0 một cách hợp lệ.
  // doiSoat() không được báo đây là lệch (sổ vẫn khớp số), và dongQuy() chạy
  // lại sau đó không được hồi sinh quỹ này về dang_hieu_luc.
  it('quỹ đã đóng được hoàn phép vào vẫn đối soát khớp, không hồi sinh, conLai phản ánh đúng phần hoàn', async () => {
    const { service, repoQuy } = await dungService([NV_CHINH_THUC]);
    await service.moKhoaLenChinhThuc(ID_NV1, 'hr1');
    const [quy] = await service.layQuyCuaNhanVien(ID_NV1);
    const id = String((quy as any)._id);
    const phanBo = [{ balanceId: id, nam: 2026, soNgay: 2 }];

    await service.giuCho(ID_NV1, phanBo, 'don1', 'nv1');
    await service.chuyenSangDaDung(ID_NV1, phanBo, 'don1', 'hr1'); // daDung=2, conLai=3

    await service.dongQuy(2026, 'hr1'); // đóng quỹ: mất 3 ngày còn dư, trangThai=da_dong, conLai=0

    // Đơn đã duyệt bị huỷ SAU KHI quỹ đã đóng — hoàn về ĐÚNG quỹ cũ.
    await service.hoanTraDaDung(ID_NV1, phanBo, 'don1', 'hr1');

    const sau = repoQuy.kho.find((x: any) => x.nam === 2026);
    expect(sau.trangThai).toBe('da_dong'); // không hồi sinh về dang_hieu_luc
    expect(sau.soNgayConLai).toBe(2); // soNgayDuocCap(2 sau khi hết hạn) - soNgayDaDung(0)

    expect(await service.doiSoat(ID_NV1)).toEqual([]); // không bị coi là lệch

    const lanHai = await service.dongQuy(2026, 'hr1');
    expect(lanHai.soQuyDaDong).toBe(0); // dongQuy sau đó bỏ qua quỹ đã đóng
  });
});
