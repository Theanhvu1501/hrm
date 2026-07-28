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
  // Task 7 (review round 4): trả BA con số riêng thay vì một `boQua` mập mờ —
  // xem doc-comment `capPhepDauNam()`.
  it('cấp đầu năm bỏ qua người còn thử việc', async () => {
    const { service, repoQuy } = await dungService();
    const ketQua = await service.capPhepDauNam(2027, 'hr1');
    expect(ketQua.daCap).toBe(1);
    expect(ketQua.daCoQuy).toBe(0);
    expect(ketQua.boQuaThuViec).toBe(1);
    expect(repoQuy.kho).toHaveLength(1);
    expect(repoQuy.kho[0].employeeId).toBe(ID_NV1);
    expect(repoQuy.kho[0].soNgayDuocCap).toBe(12);
    expect(repoQuy.kho[0].hanDung).toBe('2028-03-31');
  });

  it('cấp đầu năm chạy lần hai không cấp trùng — lần hai báo daCoQuy, không phải boQuaThuViec', async () => {
    const { service, repoQuy } = await dungService();
    await service.capPhepDauNam(2027, 'hr1');
    const lanHai = await service.capPhepDauNam(2027, 'hr1');
    expect(lanHai.daCap).toBe(0);
    expect(lanHai.daCoQuy).toBe(1);
    expect(lanHai.boQuaThuViec).toBe(1); // NV_THU_VIEC vẫn còn thử việc
    expect(repoQuy.kho).toHaveLength(1);
  });

  // Task 7: người có ngayChinhThuc từ trước nhưng CHƯA đủ tháng làm việc để
  // ra ngày nào (soNgay tính ra 0) phải rơi vào `boQuaThuViec`, KHÔNG được
  // gộp nhầm vào `daCoQuy` — trước đây cả hai đổ chung một con số `boQua`.
  it('người ra 0 ngày phép (chưa đủ tháng) rơi vào boQuaThuViec, không phải daCoQuy', async () => {
    const nvRa0Ngay = {
      _id: { toString: () => ID_NV1 },
      employeeId: 'NV0001',
      hoTen: 'Nguyễn Văn A',
      ngayVaoLam: '2027-12-28', // vào làm cuối năm 2027 → 2027 ra 0 tháng đủ 50%
      ngayChinhThuc: '2027-12-28',
      ngayLamViecTrongTuan: [1, 2, 3, 4, 5, 6],
      trangThai: 'dang_lam_viec',
      isActive: true,
    };
    const { service } = await dungService([nvRa0Ngay]);
    const ketQua = await service.capPhepDauNam(2027, 'hr1');
    expect(ketQua.daCap).toBe(0);
    expect(ketQua.daCoQuy).toBe(0);
    expect(ketQua.boQuaThuViec).toBe(1);
  });

  it('mở khoá lên chính thức — ca A cấp đúng 5 ngày cho năm vào làm', async () => {
    const { service, repoQuy, repoSo } = await dungService([NV_CHINH_THUC]);
    // homNay PHẢI ghim SAU ngayChinhThuc ('2026-10-01') — mở khoá chỉ cấp
    // khi đã tới ngày đó (Task 2, review round 4), không còn cấp ngay lúc
    // gọi bất kể ngày tương lai.
    const quy = await service.moKhoaLenChinhThuc(ID_NV1, 'hr1', '2026-10-15');
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
    // homNay SAU ngayChinhThuc ('2027-01-15') để mở khoá thực sự chạy.
    await service.moKhoaLenChinhThuc(ID_NV2, 'hr1', '2027-02-01');
    const theoNam = Object.fromEntries(
      repoQuy.kho.map((q: any) => [q.nam, q.soNgayDuocCap]),
    );
    expect(theoNam).toEqual({ 2026: 1, 2027: 12 });
    expect(repoQuy.kho.find((q: any) => q.nam === 2026).hanDung).toBe('2027-03-31');
  });

  it('lên chính thức bằng một ngày TƯƠNG LAI → CHƯA cấp gì (Task 2, review round 4)', async () => {
    const { service, repoQuy } = await dungService([NV_CHINH_THUC]);
    // homNay TRƯỚC ngayChinhThuc ('2026-10-01') — kịch bản HR nhập kế hoạch
    // hết thử việc ngay lúc tuyển: mở khoá không được cấp quỹ ngay hôm đó,
    // nếu không một người còn thử việc nhận trọn quỹ ngày đầu tiên.
    const quy = await service.moKhoaLenChinhThuc(ID_NV1, 'hr1', '2026-08-15');
    expect(quy).toEqual([]);
    expect(repoQuy.kho).toHaveLength(0);
  });

  it('mở khoá lần hai không cấp thêm', async () => {
    const { service, repoQuy } = await dungService([NV_CHINH_THUC]);
    await service.moKhoaLenChinhThuc(ID_NV1, 'hr1', '2026-10-15');
    await service.moKhoaLenChinhThuc(ID_NV1, 'hr1', '2026-10-15');
    expect(repoQuy.kho).toHaveLength(1);
  });

  it('người chưa có ngayChinhThuc thì mở khoá không tạo quỹ nào', async () => {
    const { service, repoQuy } = await dungService([NV_THU_VIEC]);
    const quy = await service.moKhoaLenChinhThuc(ID_NV2, 'hr1');
    expect(quy).toEqual([]);
    expect(repoQuy.kho).toHaveLength(0);
  });

  // Task 4 (review round 4): rollout điền ngayChinhThuc hàng loạt cho NV làm
  // lâu năm — vào làm VÀ chính thức từ 2019, nhưng hôm nay (`homNay`) đã là
  // 2026. Trước fix, vòng lặp backfill chạy `namVao..namChinhThuc` = chỉ năm
  // 2019 → tạo một quỹ ĐÃ HẾT HẠN từ 2020-03-31 và KHÔNG tạo quỹ năm nay —
  // NV không có phép nào dùng được dù hồ sơ đã "chính thức".
  it('rollout ngayChinhThuc trễ nhiều năm → KHÔNG tạo quỹ chết, LUÔN có quỹ năm hiện tại', async () => {
    const nvLauNam = {
      ...NV_CHINH_THUC,
      ngayVaoLam: '2019-03-01',
      ngayChinhThuc: '2019-06-01',
    };
    const { service, repoQuy } = await dungService([nvLauNam]);
    const quy = await service.moKhoaLenChinhThuc(ID_NV1, 'hr1', '2026-07-29');

    const cacNam = repoQuy.kho.map((q: any) => q.nam).sort();
    expect(cacNam).not.toContain(2019); // quỹ 2019 đã chết (hạn 2020-03-31) — không tạo
    expect(cacNam).toContain(2026); // quỹ năm hiện tại LUÔN được cấp
    // Vào làm 2019-03-01 → tới 31/12/2026 đã tròn 7 năm thâm niên (⌊7/5⌋=1)
    // → mucCaNam = 12 + 1 = 13, làm trọn năm 2026 nên soNgay = đúng mucCaNam.
    expect(quy.find((q: any) => q.nam === 2026)?.soNgayDuocCap).toBe(13);
    // lyDo của quỹ 2026: NV đã chính thức từ lâu, đây thực chất là phần cấp
    // đầu năm bị lỡ — không phải "cấp lên chính thức" (đã xảy ra 2019) hay
    // "cấp bù năm trước" (2026 là năm nay, không phải năm trước).
    expect(quy.find((q: any) => q.nam === 2026)?.canCuCap).toBeDefined();
  });

  it('rollout: quỹ năm hiện tại ghi sổ với lyDo cap_dau_nam khi ngayChinhThuc đã lùi xa', async () => {
    const nvLauNam = {
      ...NV_CHINH_THUC,
      ngayVaoLam: '2019-03-01',
      ngayChinhThuc: '2019-06-01',
    };
    const { service, repoSo } = await dungService([nvLauNam]);
    await service.moKhoaLenChinhThuc(ID_NV1, 'hr1', '2026-07-29');

    expect(repoSo.kho).toHaveLength(1); // đúng 1 dòng sổ — chỉ quỹ 2026 được tạo
    expect(repoSo.kho[0]).toMatchObject({ lyDo: 'cap_dau_nam', nam: 2026 });
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

// (P3.8 review round 4, IMPORTANT 11): `layQuyCuaNhanVien` nuôi khối số dư
// hiển thị cho NGƯỜI DÙNG chọn ngày (tự phục vụ + form HR nộp hộ) — trước
// fix chỉ lọc `isActive`, nên một quỹ `da_dong` đã qua hạn dùng từ 5 năm
// trước vẫn hiện mãi mãi (xoá mềm không áp dụng cho quỹ đóng đúng quy trình).
describe('QuyPhep_Service — layQuyCuaNhanVien lọc quỹ còn dùng được (Task 11)', () => {
  it('quỹ ĐÃ ĐÓNG và ĐÃ QUA HẠN DÙNG bị loại khỏi khối số dư', async () => {
    const { service, repoQuy } = await dungHaiQuy();
    repoQuy.kho.find((x: any) => x.nam === 2026).trangThai = 'da_dong';

    // homNay SAU hạn dùng quỹ 2026 ('2027-03-31') — quỹ này giờ vừa đóng vừa
    // hết hạn, đúng "lịch sử chết" cần bị loại.
    const ds = await service.layQuyCuaNhanVien(ID_NV1, 'phep_nam', '2027-04-01');

    expect(ds.map((q: any) => q.nam)).toEqual([2027]);
  });

  it('quỹ ĐÃ ĐÓNG nhưng CHƯA QUA HẠN DÙNG vẫn hiện (chưa phải lịch sử chết)', async () => {
    const { service, repoQuy } = await dungHaiQuy();
    repoQuy.kho.find((x: any) => x.nam === 2026).trangThai = 'da_dong';

    // homNay TRƯỚC hạn dùng quỹ 2026 — quỹ đóng sớm (hiếm nhưng có thể) vẫn
    // còn đáng xem cho tới hạn.
    const ds = await service.layQuyCuaNhanVien(ID_NV1, 'phep_nam', '2027-01-01');

    expect(ds.map((q: any) => q.nam).sort()).toEqual([2026, 2027]);
  });

  it('quỹ CÒN dang_hieu_luc luôn hiện dù lỡ trễ hạn đóng', async () => {
    const { service } = await dungHaiQuy();
    // homNay xa sau hạn dùng của CẢ HAI quỹ, nhưng cả hai đều còn
    // dang_hieu_luc (HR chưa bấm đóng quỹ) — vẫn phải hiện để HR còn thấy mà
    // đóng.
    const ds = await service.layQuyCuaNhanVien(ID_NV1, 'phep_nam', '2030-01-01');
    expect(ds.map((q: any) => q.nam).sort()).toEqual([2026, 2027]);
  });
});

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

  it('huỷ đơn ĐÃ DUYỆT hoàn về đúng quỹ cũ, kể cả quỹ đã đóng — phần hồi sinh hết hạn NGAY (Task 5, review round 4)', async () => {
    const { service, repoQuy, repoSo } = await dungHaiQuy();
    await service.giuCho(ID_NV1, PHAN_BO, 'don1', 'nv1');
    await service.chuyenSangDaDung(ID_NV1, PHAN_BO, 'don1', 'hr1');
    repoQuy.kho.find((x: any) => x.nam === 2026).trangThai = 'da_dong';

    await service.hoanTraDaDung(ID_NV1, PHAN_BO, 'don1', 'hr1');

    const q2026 = repoQuy.kho.find((x: any) => x.nam === 2026);
    const q2027 = repoQuy.kho.find((x: any) => x.nam === 2027);
    expect(q2026.soNgayDaDung).toBe(0);
    // (Task 5, review round 4): TRƯỚC fix, `soNgayConLai` sống lại thành 3
    // dù quỹ đã đóng — "phép ma" không đơn nào tiêu được qua
    // `phanBoChoNgayNghi` (chỉ chọn quỹ `dang_hieu_luc`) nhưng vẫn hiện ra
    // cho NV/HR, và chính là con số spec §11 hứa trả tiền phép chưa nghỉ khi
    // thôi việc — phép ma thành tiền thật. Sau fix: phần vừa hồi sinh hết
    // hạn NGAY LẬP TỨC (ghi thêm một dòng sổ `het_han`), số dư về đúng 0.
    expect(q2026.soNgayConLai).toBe(0);
    expect(q2026.soNgayDuocCap).toBe(0); // 3 (gốc) - 3 (het_han bù) = 0
    expect(q2027.soNgayDuocCap).toBe(12); // KHÔNG chảy sang quỹ mới
    expect(repoSo.kho.at(-2)).toMatchObject({ lyDo: 'huy_don', soNgay: 2 });
    expect(repoSo.kho.at(-1)).toMatchObject({ lyDo: 'het_han', soNgay: -3 });
  });

  // Task 5, review round 4 — nhánh THỨ HAI (nhaCho): `dongQuy()` cố ý giữ
  // nguyên phần đang giữ chỗ khi đóng quỹ (xem doc-comment `dongQuy()`). Nếu
  // đơn giữ chỗ đó sau đó bị TỪ CHỐI, phần vừa nhả không được "sống lại" trên
  // một quỹ đã đóng — cùng lỗi phép ma với nhánh `hoanTraDaDung` ở trên,
  // nhưng qua đường "từ chối" thay vì "huỷ đơn đã duyệt".
  it('nhaCho trên quỹ đã đóng: phần vừa nhả hết hạn NGAY, không "sống lại"', async () => {
    const { service, repoQuy, repoSo } = await dungHaiQuy();
    await service.giuCho(ID_NV1, PHAN_BO, 'don1', 'nv1'); // giữ 2 ngày trên quỹ 2026
    await service.dongQuy(2026, 'hr1'); // đóng quỹ: hold vẫn giữ nguyên, phần rảnh (1) hết hạn

    const truocNha = repoQuy.kho.find((x: any) => x.nam === 2026);
    expect(truocNha.trangThai).toBe('da_dong');
    expect(truocNha.soNgayDangChoDuyet).toBe(2); // hold vẫn còn nguyên sau khi đóng quỹ

    await service.nhaCho(ID_NV1, PHAN_BO, 'don1', 'hr1'); // đơn giữ chỗ bị TỪ CHỐI sau khi quỹ đã đóng

    const q2026 = repoQuy.kho.find((x: any) => x.nam === 2026);
    expect(q2026.soNgayDangChoDuyet).toBe(0);
    expect(q2026.soNgayConLai).toBe(0); // không phải 2 — phần vừa nhả hết hạn ngay, không sống lại
    expect(repoSo.kho.at(-1)).toMatchObject({ lyDo: 'het_han', soNgay: -2 });
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
  // trùng qua sổ" (`soRongDaDung`) — lần gọi lại thấy đã có dòng sổ
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

  // hoanTraDaDung song sinh với chuyenSangDaDung — cùng cơ chế soRongDaDung,
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

  // ────────────────────────────────────────────────────────────────────────
  // P3.8 fix round 3 — vá lại chính khoá chống trùng round 2 thêm vào
  // (tiền thân của `soRongDaDung`, "đã từng có dòng sổ chưa"): sổ ghi LỊCH SỬ, không ghi
  // TRẠNG THÁI. Chuỗi duyệt → từ chối → mở lại → duyệt là HỢP LỆ — chính app
  // hướng dẫn HR đi qua chuỗi này khi chặn chuyển thẳng da_duyet→cho_duyet
  // (xem CHUYEN_TRANG_THAI_KHONG_HOP_LE) — và lần duyệt THỨ HAI trong chuỗi
  // đó PHẢI thực sự chạy. Khoá "đã từng" sẽ thấy dòng duyet_don từ lần duyệt
  // ĐẦU và bỏ qua nhầm lần hai, làm chỗ giữ (giuCho ở bước mở lại) kẹt vĩnh
  // viễn. Khoá đúng là SỐ RÒNG (`soRongDaDung`): +1 mỗi duyet_don, −1 mỗi
  // huy_don — hai test dưới đây là lưới canh cho đúng ca này.
  // ────────────────────────────────────────────────────────────────────────
  describe('QuyPhep_Service — chuỗi duyệt → từ chối → mở lại → duyệt lại (P3.8 fix round 3)', () => {
    /** Chạy đúng chuỗi: giữ chỗ, duyệt, từ chối (hoàn), mở lại (giữ chỗ lại), duyệt lại. */
    async function chayChuoiDuyetTuChoiMoLaiDuyetLai() {
      const ctx = await dungHaiQuy();
      const { service } = ctx;
      await service.giuCho(ID_NV1, PHAN_BO, 'don1', 'nv1'); // nộp
      await service.chuyenSangDaDung(ID_NV1, PHAN_BO, 'don1', 'hr1'); // duyệt
      await service.hoanTraDaDung(ID_NV1, PHAN_BO, 'don1', 'hr1'); // từ chối → hoàn
      await service.giuCho(ID_NV1, PHAN_BO, 'don1', 'nv1'); // mở lại → giữ chỗ lại
      await service.chuyenSangDaDung(ID_NV1, PHAN_BO, 'don1', 'hr1'); // duyệt lại — PHẢI thực sự chạy
      return ctx;
    }

    it('lần duyệt thứ hai thực sự áp dụng: soNgayDaDung đúng, soNgayDangChoDuyet về 0, sổ có 2 duyet_don + 1 huy_don', async () => {
      const { repoQuy, repoSo } = await chayChuoiDuyetTuChoiMoLaiDuyetLai();

      const q2026 = repoQuy.kho.find((x: any) => x.nam === 2026);
      // Nếu khoá "đã từng có dòng" (round 2, sai) còn hiệu lực, lần duyệt
      // thứ hai bị bỏ qua NHẦM: soNgayDaDung sẽ kẹt ở 0 và
      // soNgayDangChoDuyet sẽ kẹt ở 2 (chỗ giữ không bao giờ được nhả) thay
      // vì các giá trị đúng dưới đây.
      expect(q2026.soNgayDaDung).toBe(2);
      expect(q2026.soNgayDangChoDuyet).toBe(0);

      const soQuy2026 = repoSo.kho.filter((x: any) => x.balanceId === ID_Q2026);
      expect(
        soQuy2026.filter((x: any) => x.lyDo === 'duyet_don'),
      ).toHaveLength(2);
      expect(
        soQuy2026.filter((x: any) => x.lyDo === 'huy_don'),
      ).toHaveLength(1);
    });

    it('nối tiếp bằng một lần xoá đơn (đã duyệt) → hoanTraDaDung PHẢI chạy, không bị chặn nhầm bởi huy_don của lần từ chối trước', async () => {
      const { service, repoQuy, repoSo } = await chayChuoiDuyetTuChoiMoLaiDuyetLai();

      // Đơn (giờ đã duyệt lại lần hai) bị xoá — quỹ phải hoàn về 0 đã dùng.
      // Đây chính là ca "mất ngày phép" mà khoá round 2 gây ra: khoá cũ thấy
      // dòng huy_don đã tồn tại (từ lần TỪ CHỐI trước đó) và bỏ qua nhầm,
      // nên chỗ giữ không bao giờ được nhả — NV mất trắng 2 ngày.
      await service.hoanTraDaDung(ID_NV1, PHAN_BO, 'don1', 'hr1');

      const q2026 = repoQuy.kho.find((x: any) => x.nam === 2026);
      expect(q2026.soNgayDaDung).toBe(0);
      expect(q2026.soNgayConLai).toBe(3); // về đúng số dư gốc, không mất ngày nào

      const soHuyDonQuy2026 = repoSo.kho.filter(
        (x: any) => x.balanceId === ID_Q2026 && x.lyDo === 'huy_don',
      );
      expect(soHuyDonQuy2026).toHaveLength(2); // dòng thứ hai, không bị chặn nhầm
    });
  });
});

describe('QuyPhep_Service — điều chỉnh, đóng quỹ, đối soát', () => {
  it('điều chỉnh tay bắt buộc có ghi chú', async () => {
    const { service } = await dungHaiQuy();
    await expect(
      service.dieuChinhTay(ID_NV1, ID_Q2026, -1, '', 'hr1'),
    ).rejects.toThrow();
  });

  // (P3.8 review round 4, IMPORTANT 8): modal FE mặc định ô số ngày = 0 — một
  // lần bấm Lưu lỡ tay (chưa kịp gõ số) không được ghi một dòng sổ RỖNG vĩnh
  // viễn vào sổ append-only.
  it('điều chỉnh tay soNgay = 0 bị chặn, không ghi sổ', async () => {
    const { service, repoSo } = await dungHaiQuy();
    await expect(
      service.dieuChinhTay(ID_NV1, ID_Q2026, 0, 'lý do bất kỳ', 'hr1'),
    ).rejects.toThrow();
    expect(repoSo.kho).toHaveLength(0);
  });

  // Trừ vượt quá số NGÀY ĐÃ DÙNG thật (không phải trừ vượt số đang giữ chỗ —
  // đó là thao tác hợp lệ, xem test 'duyệt hỏng ở quỹ thứ hai...' ở trên) là
  // trạng thái không thể có thật: đã tiêu nhiều hơn số được cấp.
  it('điều chỉnh tay đẩy soNgayDuocCap xuống dưới soNgayDaDung bị chặn', async () => {
    const { service, repoQuy, repoSo } = await dungHaiQuy();
    // Duyệt trước 2 ngày trên quỹ 2026 (duocCap=3) để có soNgayDaDung=2.
    const phanBo = [{ balanceId: ID_Q2026, nam: 2026, soNgay: 2 }];
    await service.giuCho(ID_NV1, phanBo, 'don1', 'nv1');
    await service.chuyenSangDaDung(ID_NV1, phanBo, 'don1', 'hr1');
    const truocDieuChinh = repoSo.kho.length;

    // Trừ 2 ngày nữa: duocCap 3 → 1, thấp hơn soNgayDaDung (2) → không thể có thật.
    await expect(
      service.dieuChinhTay(ID_NV1, ID_Q2026, -2, 'trừ nhầm quá tay', 'hr1'),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repoSo.kho.length).toBe(truocDieuChinh); // không ghi sổ gì thêm
    const q2026 = repoQuy.kho.find((x: any) => x.nam === 2026);
    expect(q2026.soNgayDuocCap).toBe(3); // không đổi

    // Trong khi đó, trừ vào phần ĐANG GIỮ CHỖ (không phải đã dùng) của quỹ
    // 2027 vẫn HỢP LỆ — đây chính là kịch bản đã test ở
    // 'duyệt hỏng ở quỹ thứ hai...', giữ nguyên không bị Task 8 chặn nhầm.
    await service.dieuChinhTay(ID_NV1, ID_Q2027, -5, 'giảm nhầm', 'hr1');
    expect(repoQuy.kho.find((x: any) => x.nam === 2027).soNgayDuocCap).toBe(7);
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
    await service.moKhoaLenChinhThuc(ID_NV1, 'hr1', '2026-10-15');
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
    await service.moKhoaLenChinhThuc(ID_NV1, 'hr1', '2026-10-15');
    repoQuy.kho[0].soNgayDuocCap = 99; // ai đó ghi thẳng vào quỹ, không ghi sổ

    const lech = await service.doiSoat(ID_NV1);
    expect(lech).toHaveLength(1);
    expect(lech[0]).toMatchObject({ theoSo: 5, theoQuy: 99 });
  });

  // Ca đặc biệt: quỹ đã ĐÓNG rồi mới nhận hoàn trả (đơn đã duyệt trước lúc
  // đóng bị huỷ SAU khi đóng). Task 5 (review round 4): phần hoàn về không
  // được phép "sống lại" trên một quỹ đã đóng — hoanTraDaDung() giờ tự phát
  // hiện và hết hạn NGAY phần đó (ghi thêm một dòng sổ `het_han`), nên
  // `soNgayConLai` PHẢI về đúng 0, không phải phần hoàn dương như trước fix.
  // doiSoat() không được báo đây là lệch (sổ vẫn khớp số), và dongQuy() chạy
  // lại sau đó không được hồi sinh quỹ này về dang_hieu_luc.
  it('quỹ đã đóng được hoàn phép vào không sống lại, vẫn đối soát khớp, không hồi sinh', async () => {
    const { service, repoQuy } = await dungService([NV_CHINH_THUC]);
    await service.moKhoaLenChinhThuc(ID_NV1, 'hr1', '2026-10-15');
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
    // soNgayDuocCap: 5 (gốc) - 3 (het_han lúc dongQuy) - 2 (het_han bù ngay
    // sau khi hoàn) = 0. Phần hoàn KHÔNG được phép hiển thị thành số dư dùng
    // được — đó là "phép ma" mà Task 5 vá.
    expect(sau.soNgayDuocCap).toBe(0);
    expect(sau.soNgayConLai).toBe(0);

    expect(await service.doiSoat(ID_NV1)).toEqual([]); // không bị coi là lệch

    const lanHai = await service.dongQuy(2026, 'hr1');
    expect(lanHai.soQuyDaDong).toBe(0); // dongQuy sau đó bỏ qua quỹ đã đóng
  });
});

// (P3.8 review round 4, IMPORTANT 6): `ghi()` đảo thứ tự — SỔ TRƯỚC, SỐ DƯ
// SAU cho một quỹ ĐÃ TỒN TẠI. Thứ tự CŨ (số dư trước) hỏng giữa chừng để lại
// số dư đã di chuyển mà sổ không có dấu vết — retry sẽ áp dụng lần hai. Thứ
// tự MỚI thất bại giữa chừng để lại đúng một dòng sổ không khớp số dư,
// `doiSoat()` phát hiện được và người dựng lại từ sổ — đúng lý do sổ tồn tại.
describe('QuyPhep_Service — ghi() ghi sổ trước, số dư sau (Task 6)', () => {
  it('quỹ ĐÃ TỒN TẠI: sổ hỏng → số dư KHÔNG bị đổi, an toàn để retry', async () => {
    const { service, repoQuy, repoSo } = await dungHaiQuy();
    const phanBo = [{ balanceId: ID_Q2026, nam: 2026, soNgay: 2 }];
    repoSo.save = jest.fn().mockRejectedValueOnce(new Error('sổ hỏng'));

    await expect(
      service.chuyenSangDaDung(ID_NV1, phanBo, 'don1', 'hr1'),
    ).rejects.toThrow('sổ hỏng');

    const q2026 = repoQuy.kho.find((x: any) => x.nam === 2026);
    // Nếu thứ tự CŨ (số dư trước, sổ sau) còn hiệu lực, soNgayDaDung đã lên 2
    // dù sổ ghi hỏng — một lần retry sau đó sẽ cộng chồng lần hai (số dư âm
    // thầm bị trừ hai lần cho cùng một lần duyệt). Thứ tự MỚI giữ số dư
    // nguyên vẹn.
    expect(q2026.soNgayDaDung).toBe(0);
    expect(q2026.soNgayDangChoDuyet).toBe(0); // vẫn chưa bị trừ khỏi chỗ giữ
    expect(q2026.soNgayConLai).toBe(3);
  });

  it('quỹ MỚI (capMotNam, chưa có _id): buộc lưu số dư trước để lấy id — nhưng gọi lại không cấp trùng nhờ idempotent riêng của capMotNam', async () => {
    const { service, repoQuy, repoSo } = await dungService([NV_CHINH_THUC]);
    repoSo.save = jest.fn().mockRejectedValueOnce(new Error('sổ hỏng'));

    await expect(
      service.moKhoaLenChinhThuc(ID_NV1, 'hr1', '2026-10-15'),
    ).rejects.toThrow('sổ hỏng');

    // Quỹ đã được TẠO — không có balanceId nào để ghi sổ trước khi quỹ này
    // có _id, nên nhánh "quỹ mới" của ghi() buộc phải lưu số dư trước.
    expect(repoQuy.kho).toHaveLength(1);

    // Gọi lại: capMotNam() thấy quỹ đã tồn tại (timQuy) và bỏ qua — KHÔNG cấp
    // trùng, dù sổ của lần trước bị thiếu do repoSo.save hỏng.
    const lanHai = await service.moKhoaLenChinhThuc(ID_NV1, 'hr1', '2026-10-15');
    expect(lanHai).toEqual([]);
    expect(repoQuy.kho).toHaveLength(1);
  });
});
