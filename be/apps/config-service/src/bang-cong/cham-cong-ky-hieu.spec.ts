import {
  KY_HIEU_CHAM_CONG,
  soCongCuaKyHieu,
  nguonCuaO,
  NGUON_O,
} from './cham-cong-ky-hieu';

describe('KY_HIEU_CHAM_CONG', () => {
  it('có ký hiệu NB (nghỉ bù) tính 1 công', () => {
    const nb = KY_HIEU_CHAM_CONG.find((k) => k.kyHieu === 'NB');
    expect(nb).toBeDefined();
    expect(nb!.soCong).toBe(1);
    expect(nb!.nhom).toBe('nghi_huong_luong');
    expect(soCongCuaKyHieu('NB')).toBe(1);
  });

  it('có ký hiệu N (ngày nghỉ theo lịch) KHÔNG tính công', () => {
    const n = KY_HIEU_CHAM_CONG.find((k) => k.kyHieu === 'N');
    expect(n).toBeDefined();
    expect(n!.nhom).toBe('ngay_nghi');
    // 0 công là điều kiện sống còn: `soNgayCong` cộng thẳng
    // `soCongCuaKyHieu` của mọi ô, nên N khác 0 sẽ cộng thêm công cho mỗi
    // cuối tuần của mỗi người — sai lương toàn công ty ngay tháng đầu.
    expect(n!.soCong).toBe(0);
    expect(soCongCuaKyHieu('N')).toBe(0);
  });

  it('có ký hiệu OL (làm online) tính 1 công, nhóm làm việc', () => {
    const ol = KY_HIEU_CHAM_CONG.find((k) => k.kyHieu === 'OL');
    expect(ol).toStrictEqual({
      kyHieu: 'OL',
      nhan: 'Làm online',
      soCong: 1,
      nhom: 'lam_viec',
    });
    expect(soCongCuaKyHieu('OL')).toBe(1);
  });

  it('không đổi số công của các ký hiệu đã có', () => {
    expect(soCongCuaKyHieu('X')).toBe(1);
    expect(soCongCuaKyHieu('1/2')).toBe(0.5);
    expect(soCongCuaKyHieu('P')).toBe(1);
    expect(soCongCuaKyHieu('L')).toBe(1);
    expect(soCongCuaKyHieu('CT')).toBe(1);
    expect(soCongCuaKyHieu('O')).toBe(0);
    expect(soCongCuaKyHieu('KL')).toBe(0);
    expect(soCongCuaKyHieu(undefined)).toBe(0);
    expect(soCongCuaKyHieu('KHONG_TON_TAI')).toBe(0);
  });
});

describe('nguonCuaO', () => {
  // Ô đang tồn tại trên production KHÔNG có `nguon` — tất cả đều do HR tick
  // tay từ trước khi có tự sinh. Coi mặc định là 'tu_dong' thì lần tổng hợp
  // đầu tiên sau khi deploy sẽ xoá sạch công sức nhập liệu của nhiều tháng.
  it('ô thiếu nguon được coi là hr_sua', () => {
    expect(nguonCuaO({})).toBe(NGUON_O.HR_SUA);
    expect(nguonCuaO({ nguon: undefined })).toBe(NGUON_O.HR_SUA);
    expect(nguonCuaO({ nguon: '' })).toBe(NGUON_O.HR_SUA);
  });

  it('giữ nguyên nguon đã có', () => {
    expect(nguonCuaO({ nguon: 'tu_dong' })).toBe(NGUON_O.TU_DONG);
    expect(nguonCuaO({ nguon: 'hr_sua' })).toBe(NGUON_O.HR_SUA);
  });
});
