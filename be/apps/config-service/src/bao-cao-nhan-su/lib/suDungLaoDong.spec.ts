import type { Employee } from '@app/entities';
import { dungBaoCaoSuDungLaoDong } from './suDungLaoDong';

function nv(over: Partial<Employee> = {}): Employee {
  return {
    hoTen: 'A',
    gioiTinh: 'nam',
    ngaySinh: '1990-01-01',
    ngayVaoLam: '2020-01-01',
    loaiHopDong: 'chinh_thuc',
    departmentId: 'pb-1',
    isActive: true,
    ...over,
  } as Employee;
}

const TU = '2026-01-01';
const DEN = '2026-06-30';

describe('dungBaoCaoSuDungLaoDong', () => {
  it('đếm người CÒN LÀM tại ngày chốt, chia theo giới', () => {
    const ra = dungBaoCaoSuDungLaoDong(
      [nv(), nv({ gioiTinh: 'nu' }), nv({ gioiTinh: 'nu' })],
      TU,
      DEN,
    );
    expect(ra.tongLaoDong).toBe(3);
    expect(ra.nu).toBe(2);
    expect(ra.nam).toBe(1);
  });

  it('người nghỉ TRƯỚC ngày chốt không được đếm', () => {
    const ra = dungBaoCaoSuDungLaoDong(
      [nv(), nv({ ngayNghiViec: '2026-03-31' })],
      TU,
      DEN,
    );
    expect(ra.tongLaoDong).toBe(1);
    expect(ra.giamTrongKy).toBe(1);
  });

  it('người nghỉ SAU kỳ vẫn được đếm là đang làm tại ngày chốt', () => {
    const ra = dungBaoCaoSuDungLaoDong(
      [nv({ ngayNghiViec: '2026-08-01' })],
      TU,
      DEN,
    );
    expect(ra.tongLaoDong).toBe(1);
    expect(ra.giamTrongKy).toBe(0);
  });

  it('người vào làm SAU ngày chốt chưa tính vào tổng', () => {
    const ra = dungBaoCaoSuDungLaoDong(
      [nv({ ngayVaoLam: '2026-09-01' })],
      TU,
      DEN,
    );
    expect(ra.tongLaoDong).toBe(0);
  });

  it('đếm tăng trong kỳ theo ngày vào làm', () => {
    const ra = dungBaoCaoSuDungLaoDong(
      [nv({ ngayVaoLam: '2026-02-01' }), nv({ ngayVaoLam: '2025-12-01' })],
      TU,
      DEN,
    );
    expect(ra.tangTrongKy).toBe(1);
  });

  it('chia theo loại hợp đồng và phòng ban', () => {
    const ra = dungBaoCaoSuDungLaoDong(
      [
        nv({ loaiHopDong: 'thu_viec', departmentId: 'pb-2' }),
        nv({ loaiHopDong: 'chinh_thuc' }),
        nv({ loaiHopDong: 'chinh_thuc' }),
      ],
      TU,
      DEN,
    );
    expect(ra.theoLoaiHopDong).toStrictEqual({ thu_viec: 1, chinh_thuc: 2 });
    expect(ra.theoPhongBan).toStrictEqual({ 'pb-2': 1, 'pb-1': 2 });
  });

  it('đếm lao động chưa thành niên theo tuổi TẠI NGÀY CHỐT', () => {
    const ra = dungBaoCaoSuDungLaoDong(
      [nv({ ngaySinh: '2009-07-01' }), nv({ ngaySinh: '2008-01-01' })],
      TU,
      DEN,
    );
    // 2009-07-01 tại 2026-06-30 là 16 tuổi (chưa qua sinh nhật) → dưới 18.
    // 2008-01-01 tại 2026-06-30 là 18 tuổi → không tính.
    expect(ra.duoiViThanhNien).toBe(1);
  });

  it('lao động cao tuổi tính theo mốc nghỉ hưu của từng giới', () => {
    const ra = dungBaoCaoSuDungLaoDong(
      [
        nv({ gioiTinh: 'nu', ngaySinh: '1970-01-01' }), // 56 → tính
        nv({ gioiTinh: 'nam', ngaySinh: '1970-01-01' }), // 56 → chưa tính
        nv({ gioiTinh: 'nam', ngaySinh: '1960-01-01' }), // 66 → tính
      ],
      TU,
      DEN,
    );
    expect(ra.caoTuoi).toBe(2);
  });

  it('hồ sơ đã xoá mềm không vào báo cáo nộp cơ quan', () => {
    const ra = dungBaoCaoSuDungLaoDong([nv({ isActive: false })], TU, DEN);
    expect(ra.tongLaoDong).toBe(0);
  });
});
