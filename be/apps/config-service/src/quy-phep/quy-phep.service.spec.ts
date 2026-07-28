import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
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
      }
      return x;
    },
    find: async ({ where }: any = {}) =>
      kho.filter((x) =>
        Object.entries(where ?? {}).every(([k, v]) => (x as any)[k] === v),
      ),
    findOne: async ({ where }: any) =>
      kho.find((x) =>
        Object.entries(where ?? {}).every(([k, v]) => String((x as any)[k]) === String(v)),
      ) ?? null,
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
