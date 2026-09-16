import type { Employee, EmploymentHistory, Timesheet } from '@app/entities';
import { dungChiSoThang } from './chiSoNhanSu';

function nv(over: Partial<Employee> = {}): Employee {
  return {
    hoTen: 'A',
    ngayVaoLam: '2024-01-01',
    isActive: true,
    ...over,
  } as Employee;
}

const KY = '2026-09';

describe('dungChiSoThang', () => {
  it('đếm người còn làm tại cuối kỳ', () => {
    const ra = dungChiSoThang(
      KY,
      [nv(), nv({ ngayNghiViec: '2026-08-31' }), nv({ ngayVaoLam: '2026-10-01' })],
      [],
      [],
    );
    expect(ra.tongNhanSu).toBe(1);
  });

  it('vào mới / nghỉ việc đếm theo mốc trong tháng', () => {
    const ra = dungChiSoThang(
      KY,
      [
        nv({ ngayVaoLam: '2026-09-05' }),
        nv({ ngayNghiViec: '2026-09-20' }),
        nv({ ngayNghiViec: '2026-08-20' }),
      ],
      [],
      [],
    );
    expect(ra.vaoMoi).toBe(1);
    expect(ra.nghiViec).toBe(1);
  });

  it('nghỉ sớm = chưa làm đủ 6 tháng', () => {
    const ra = dungChiSoThang(
      KY,
      [
        nv({ ngayVaoLam: '2026-07-01', ngayNghiViec: '2026-09-10' }),
        nv({ ngayVaoLam: '2025-01-01', ngayNghiViec: '2026-09-11' }),
      ],
      [],
      [],
    );
    expect(ra.nghiViec).toBe(2);
    expect(ra.nghiSom).toBe(1);
  });

  it('lượt thăng tiến đếm từ quyết định bổ nhiệm trong kỳ', () => {
    const qt = [
      { loaiThayDoi: 'bo_nhiem', ngayHieuLuc: '2026-09-01', isActive: true },
      { loaiThayDoi: 'bo_nhiem', ngayHieuLuc: '2026-08-01', isActive: true },
      { loaiThayDoi: 'dieu_chuyen', ngayHieuLuc: '2026-09-02', isActive: true },
    ] as EmploymentHistory[];
    expect(dungChiSoThang(KY, [], qt, []).luotThangTien).toBe(1);
  });

  it('chưa tổng hợp bảng công thì trả null, KHÔNG trả 0%', () => {
    const ra = dungChiSoThang(KY, [nv()], [], []);
    expect(ra.tyLeVangMat).toBeNull();
    expect(ra.gioLamThem).toBeNull();
  });

  it('có bảng công thì tính tỷ lệ vắng mặt và tổng giờ làm thêm', () => {
    const bc = [
      {
        thang: KY,
        soNgayCong: 18,
        soNgayNghiKhongLuong: 1,
        soNgayOm: 1,
        soGioLamThem: 4,
        isActive: true,
      },
      {
        thang: KY,
        soNgayCong: 20,
        soNgayNghiKhongLuong: 0,
        soNgayOm: 0,
        soGioLamThem: 2,
        isActive: true,
      },
    ] as Timesheet[];

    const ra = dungChiSoThang(KY, [nv()], [], bc);
    // 2 ngày nghỉ / (38 công + 2 nghỉ) = 5%
    expect(ra.tyLeVangMat).toBe(5);
    expect(ra.gioLamThem).toBe(6);
  });

  it('bảng công của tháng khác không bị tính nhầm vào kỳ này', () => {
    const bc = [
      { thang: '2026-08', soNgayCong: 20, soGioLamThem: 10, isActive: true },
    ] as Timesheet[];
    expect(dungChiSoThang(KY, [nv()], [], bc).gioLamThem).toBeNull();
  });
});
