import { BadRequestException } from '@nestjs/common';
import { CloneMasterDataService } from './clone-master-data.service';

// Repo giả lưu mảng docs theo tenantId, hỗ trợ find/save như MongoRepository.
function fakeRepo(initial: any[] = []) {
  const store = [...initial];
  return {
    store,
    find: jest.fn(async ({ where }: any) => store.filter((d) => d.tenantId === where.tenantId)),
    save: jest.fn(async (doc: any) => { store.push(doc); return doc; }),
  };
}

// validate() dựng new ObjectId(src/dst) → BẮT BUỘC dùng chuỗi 24-hex hợp lệ.
const SRC = '698d593acb5ad81be4c27711';
const DST = '69a2bfcfb324c4058b45ed62';

function svcWith(repos: Record<string, any>) {
  return new CloneMasterDataService(repos as any);
}

describe('CloneMasterDataService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('execute: insert bản mới, skip bản trùng ma, set tenantId đích', async () => {
    const repos = {
      KhoanMuc: fakeRepo([
        { _id: 's1', ma: 'A', ten: 'KM A', tenantId: SRC },
        { _id: 's2', ma: 'B', ten: 'KM B', tenantId: SRC },
        { _id: 'd1', ma: 'A', ten: 'KM A cũ', tenantId: DST }, // trùng ma A
      ]),
    };
    const res = await svcWith(repos).execute(SRC, DST, ['khoan-muc']);
    expect(res[0]).toMatchObject({ key: 'khoan-muc', inserted: 1, skipped: 1 });
    const inserted = repos.KhoanMuc.store.filter((d) => d.tenantId === DST);
    expect(inserted).toHaveLength(2); // d1 cũ + B mới
    expect(inserted.some((d) => d.ma === 'B')).toBe(true);
    expect(repos.KhoanMuc.store.find((d) => d.ma === 'B' && d.tenantId === DST)._id).not.toBe('s2');
  });

  it('execute: remap tai-khoan.parentId sang _id mới', async () => {
    const repos = {
      TaiKhoan: fakeRepo([
        { _id: 'p', ma: '112', ten: 'Cha', parentId: null, tenantId: SRC },
        { _id: 'c', ma: '1121', ten: 'Con', parentId: 'p', tenantId: SRC },
      ]),
    };
    await svcWith(repos).execute(SRC, DST, ['tai-khoan']);
    const dst = repos.TaiKhoan.store.filter((d) => d.tenantId === DST);
    const cha = dst.find((d) => d.ma === '112');
    const con = dst.find((d) => d.ma === '1121');
    expect(con.parentId).toBe(String(cha._id));
    expect(con.parentId).not.toBe('p');
  });

  it('execute: quy-chuan.hoSoChungTu[].id remap theo ho-so-chung-tu (xử lý trước)', async () => {
    const repos = {
      HoSoChungTu: fakeRepo([{ _id: 'h1', ma: '02', ten: 'Phiếu chi', tenantId: SRC }]),
      QuyChuan: fakeRepo([{
        _id: 'q1', loaiGiaoDich: 'PHIEU_CHI', nghiepVu: 'X', taiKhoanNo: '111', taiKhoanCo: '112',
        hoSoChungTu: [{ id: 'h1', ma: '02', ten: 'Phiếu chi' }], tenantId: SRC,
      }]),
    };
    await svcWith(repos).execute(SRC, DST, ['ho-so-chung-tu', 'quy-chuan']);
    const newHs = repos.HoSoChungTu.store.find((d) => d.tenantId === DST);
    const newQc = repos.QuyChuan.store.find((d) => d.tenantId === DST);
    expect(newQc.hoSoChungTu[0].id).toBe(String(newHs._id));
    expect(newQc.hoSoChungTu[0].ma).toBe('02');
  });

  it('preview: đếm willInsert/willSkip, không ghi', async () => {
    const repos = {
      KhoanMuc: fakeRepo([
        { _id: 's1', ma: 'A', tenantId: SRC },
        { _id: 'd1', ma: 'A', tenantId: DST },
        { _id: 's2', ma: 'B', tenantId: SRC },
      ]),
    };
    const before = repos.KhoanMuc.store.length;
    const rows = await svcWith(repos).preview(SRC, DST, ['khoan-muc']);
    expect(rows[0]).toMatchObject({ total: 2, willInsert: 1, willSkip: 1 });
    expect(repos.KhoanMuc.store.length).toBe(before); // không ghi
  });

  it('selected: categories không phải mảng → BadRequestException', async () => {
    await expect(svcWith({}).execute(SRC, DST, 'quy-chuan' as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('execute: lỗi giữa chừng vẫn báo số đã insert thực tế', async () => {
    let n = 0;
    const repo = {
      find: jest.fn(async ({ where }: any) => where.tenantId === SRC
        ? [{ _id: 's1', ma: 'A', tenantId: SRC }, { _id: 's2', ma: 'B', tenantId: SRC }]
        : []),
      save: jest.fn(async (doc: any) => { n++; if (n === 2) throw new Error('boom'); return doc; }),
    };
    const res = await svcWith({ KhoanMuc: repo }).execute(SRC, DST, ['khoan-muc']);
    expect(res[0].inserted).toBe(1);
    expect(res[0].error).toContain('boom');
  });

  describe('validate: lỗi đầu vào → BadRequestException', () => {
    it('nguồn === đích → BadRequestException', async () => {
      await expect(svcWith({}).execute(SRC, SRC, [])).rejects.toBeInstanceOf(BadRequestException);
    });

    it('id sai định dạng → BadRequestException', async () => {
      await expect(svcWith({}).preview('bad-id', DST, [])).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
