import {
  cacNgayTrongThang,
  tapNgayLeCuaThang,
  gomTheoNgay,
  demMuonSom,
  tongGioOt,
} from './nguon-thang';

const NV1 = '650000000000000000000001';
const NV2 = '650000000000000000000002';

function banGhi(ghiDe: Record<string, any> = {}) {
  return {
    employeeId: NV1,
    ngay: '2026-08-03',
    loai: 'vao',
    ngoaiVung: false,
    soPhutDiMuon: 0,
    soPhutVeSom: 0,
    isActive: true,
    ...ghiDe,
  } as any;
}

function don(ghiDe: Record<string, any> = {}) {
  return {
    employeeId: NV1,
    loaiDon: 'nghi_phep',
    loaiNghi: 'phep_nam',
    ngay: '2026-08-05',
    trangThai: 'da_duyet',
    isActive: true,
    ...ghiDe,
  } as any;
}

describe('cacNgayTrongThang', () => {
  it('tháng 31 ngày', () => {
    const ds = cacNgayTrongThang('2026-08');
    expect(ds).toHaveLength(31);
    expect(ds[0]).toBe('2026-08-01');
    expect(ds[30]).toBe('2026-08-31');
  });

  it('tháng 2 năm không nhuận có 28 ngày', () => {
    expect(cacNgayTrongThang('2027-02')).toHaveLength(28);
  });

  it('tháng 2 năm nhuận có 29 ngày', () => {
    expect(cacNgayTrongThang('2028-02')).toHaveLength(29);
  });
});

describe('tapNgayLeCuaThang', () => {
  it('trải khoảng lễ nhiều ngày ra từng ngày', () => {
    const tap = tapNgayLeCuaThang(
      [{ tuNgay: '2026-09-01', denNgay: '2026-09-03', isActive: true } as any],
      '2026-09',
    );
    expect([...tap].sort()).toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
  });

  it('cắt đúng phần rơi vào tháng đang xét', () => {
    const tap = tapNgayLeCuaThang(
      [{ tuNgay: '2026-08-30', denNgay: '2026-09-02', isActive: true } as any],
      '2026-09',
    );
    expect([...tap].sort()).toEqual(['2026-09-01', '2026-09-02']);
  });

  it('bỏ qua ngày lễ đã tắt', () => {
    const tap = tapNgayLeCuaThang(
      [{ tuNgay: '2026-09-02', denNgay: '2026-09-02', isActive: false } as any],
      '2026-09',
    );
    expect(tap.size).toBe(0);
  });
});

describe('gomTheoNgay', () => {
  it('gom bản ghi theo nhân viên và ngày', () => {
    const map = gomTheoNgay(
      [banGhi(), banGhi({ loai: 'ra' }), banGhi({ employeeId: NV2 })],
      [],
      '2026-08',
    );
    expect(map.get(NV1)!.get('2026-08-03')).toMatchObject({ coChamVao: true, coChamRa: true });
    expect(map.get(NV2)!.get('2026-08-03')).toMatchObject({ coChamVao: true, coChamRa: false });
  });

  it('một bản ghi ngoài vùng là cả ngày mang cờ ngoài vùng', () => {
    const map = gomTheoNgay([banGhi(), banGhi({ loai: 'ra', ngoaiVung: true })], [], '2026-08');
    expect(map.get(NV1)!.get('2026-08-03')!.coBanGhiNgoaiVung).toBe(true);
  });

  it('bỏ qua bản ghi isActive=false', () => {
    const map = gomTheoNgay([banGhi({ isActive: false })], [], '2026-08');
    expect(map.get(NV1)?.get('2026-08-03')?.coChamVao ?? false).toBe(false);
  });

  it('trải đơn nghỉ theo khoảng ngày ra từng ngày', () => {
    const map = gomTheoNgay([], [don({ ngay: '2026-08-05', denNgay: '2026-08-07' })], '2026-08');
    for (const ngay of ['2026-08-05', '2026-08-06', '2026-08-07']) {
      expect(map.get(NV1)!.get(ngay)!.donNghi).toMatchObject({ loaiDon: 'nghi_phep', loaiNghi: 'phep_nam' });
    }
    expect(map.get(NV1)!.get('2026-08-08')?.donNghi ?? null).toBeNull();
  });

  it('đơn một ngày có buoi → laNuaNgay', () => {
    const map = gomTheoNgay([], [don({ buoi: 'sang' })], '2026-08');
    expect(map.get(NV1)!.get('2026-08-05')!.donNghi!.laNuaNgay).toBe(true);
  });

  // Cùng quy ước tinhSoNgayNghi() của luat-don.ts: buoi chỉ có nghĩa khi đơn
  // đúng một ngày, vì không rõ nửa ngày áp cho ngày nào trong khoảng.
  it('đơn nhiều ngày bỏ qua buoi', () => {
    const map = gomTheoNgay([], [don({ ngay: '2026-08-05', denNgay: '2026-08-06', buoi: 'sang' })], '2026-08');
    expect(map.get(NV1)!.get('2026-08-05')!.donNghi!.laNuaNgay).toBe(false);
  });

  it('chỉ lấy đơn đã duyệt, còn hiệu lực, và đúng loại', () => {
    const map = gomTheoNgay(
      [],
      [
        don({ ngay: '2026-08-10', trangThai: 'cho_duyet' }),
        don({ ngay: '2026-08-11', isActive: false }),
        don({ ngay: '2026-08-12', loaiDon: 'lam_them_gio' }),
        don({ ngay: '2026-08-13', loaiDon: 'giai_trinh' }),
      ],
      '2026-08',
    );
    for (const ngay of ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13']) {
      expect(map.get(NV1)?.get(ngay)?.donNghi ?? null).toBeNull();
    }
  });

  it('đơn nghỉ bù được giữ', () => {
    const map = gomTheoNgay([], [don({ loaiDon: 'nghi_bu', loaiNghi: undefined })], '2026-08');
    expect(map.get(NV1)!.get('2026-08-05')!.donNghi!.loaiDon).toBe('nghi_bu');
  });

  it('cắt phần đơn nằm ngoài tháng đang xét', () => {
    const map = gomTheoNgay([], [don({ ngay: '2026-07-30', denNgay: '2026-08-02' })], '2026-08');
    expect(map.get(NV1)!.get('2026-08-01')!.donNghi).not.toBeNull();
    expect(map.get(NV1)!.get('2026-08-02')!.donNghi).not.toBeNull();
    expect([...map.get(NV1)!.keys()].some((k) => k.startsWith('2026-07'))).toBe(false);
  });

  it('input rỗng → map rỗng', () => {
    const map = gomTheoNgay([], [], '2026-08');
    expect(map.size).toBe(0);
  });

  it('map.get("<id lạ>") là undefined', () => {
    const map = gomTheoNgay([banGhi()], [], '2026-08');
    expect(map.get('unknown-id')).toBeUndefined();
  });
});

describe('gomTheoNgay — nghỉ bù theo giờ', () => {
  const donNghiBu = (over: any = {}) => ({
    employeeId: 'nv1', loaiDon: 'nghi_bu', trangThai: 'da_duyet',
    ngay: '2026-02-10', isActive: true, ...over,
  });

  // Nghỉ bù lẻ giờ KHÔNG được sinh ký hiệu: người đó vẫn đi làm hôm ấy, chỉ
  // về sớm vài tiếng, và quỹ giờ đã gánh phần vắng mặt. Sinh NB là biến một
  // ngày công thật thành ngày nghỉ.
  it('bỏ qua đơn nghỉ bù theo_gio', () => {
    const map = gomTheoNgay([], [donNghiBu({ kieuNghi: 'theo_gio', gioTu: '15:00', gioDen: '17:00' })], '2026-02');
    expect(map.get('nv1')?.get('2026-02-10')?.donNghi).toBeFalsy();
  });

  it('vẫn nhận đơn nghỉ bù theo_ngay', () => {
    const map = gomTheoNgay([], [donNghiBu({ kieuNghi: 'theo_ngay', denNgay: '2026-02-10', buoi: 'ca_ngay' })], '2026-02');
    expect(map.get('nv1')?.get('2026-02-10')?.donNghi).toMatchObject({ loaiDon: 'nghi_bu' });
  });

  // Đơn cũ tạo trước P4.2a không có kieuNghi — phải giữ nguyên hành vi cũ,
  // nếu không lần Tổng hợp đầu tiên sau deploy sẽ xoá trắng ký hiệu NB của
  // mọi đơn nghỉ bù lịch sử.
  it('đơn cũ thiếu kieuNghi vẫn được coi là theo ngày', () => {
    const map = gomTheoNgay([], [donNghiBu({ denNgay: '2026-02-10', buoi: 'ca_ngay' })], '2026-02');
    expect(map.get('nv1')?.get('2026-02-10')?.donNghi).toMatchObject({ loaiDon: 'nghi_bu' });
  });
});

describe('demMuonSom', () => {
  it('đếm số LƯỢT đi muộn và về sớm theo nhân viên', () => {
    const map = demMuonSom([
      banGhi({ soPhutDiMuon: 10 }),
      banGhi({ ngay: '2026-08-04', soPhutDiMuon: 5 }),
      banGhi({ loai: 'ra', soPhutVeSom: 20 }),
      banGhi({ employeeId: NV2, soPhutDiMuon: 3 }),
      banGhi({ soPhutDiMuon: 0 }),
    ]);
    expect(map.get(NV1)).toEqual({ diMuon: 2, veSom: 1 });
    expect(map.get(NV2)).toEqual({ diMuon: 1, veSom: 0 });
  });

  it('input rỗng → map rỗng', () => {
    expect(demMuonSom([]).size).toBe(0);
  });

  // ──────────────────────────────────────────────────────────────────────
  // Hai ca dưới đây lấy nguyên từ dữ liệu THẬT trên production 2026-08-05.
  // Người dùng bấm nhiều lần "cho chắc", và cách đếm cũ (mỗi bản ghi một
  // lượt) biến việc bấm thừa thành vi phạm kỷ luật không có thật.
  // ──────────────────────────────────────────────────────────────────────

  it('bấm RA nhiều lần: chỉ lượt CUỐI quyết định về sớm', () => {
    // Vũ Duy Mạnh 2026-08-03, ca 08:00–17:00: bấm ra ba lần, lần cuối 17:00
    // là ĐÚNG GIỜ. Cách đếm cũ ra veSom = 2.
    const map = demMuonSom([
      banGhi({ loai: 'vao', thoiDiem: '2026-08-03T01:25:00Z', soPhutDiMuon: 25 }),
      banGhi({ loai: 'ra', thoiDiem: '2026-08-03T09:58:00Z', soPhutVeSom: 2 }),
      banGhi({ loai: 'ra', thoiDiem: '2026-08-03T09:59:00Z', soPhutVeSom: 1 }),
      banGhi({ loai: 'ra', thoiDiem: '2026-08-03T10:00:00Z', soPhutVeSom: 0 }),
    ]);
    expect(map.get(NV1)).toEqual({ diMuon: 1, veSom: 0 });
  });

  it('bấm VÀO nhiều lần: chỉ lượt ĐẦU quyết định đi muộn', () => {
    // Đào Thị Kiều Oanh 2026-07-21: vào 08:00 (đúng giờ) rồi bấm lại 09:00;
    // ra 15:00 rồi ra lại 22:00. Thực tế: không muộn, không sớm.
    // Cách đếm cũ ra { diMuon: 1, veSom: 1 }.
    const map = demMuonSom([
      banGhi({ ngay: '2026-07-21', loai: 'vao', thoiDiem: '2026-07-21T01:00:00Z', soPhutDiMuon: 0 }),
      banGhi({ ngay: '2026-07-21', loai: 'vao', thoiDiem: '2026-07-21T02:00:00Z', soPhutDiMuon: 60 }),
      banGhi({ ngay: '2026-07-21', loai: 'ra', thoiDiem: '2026-07-21T08:00:00Z', soPhutVeSom: 120 }),
      banGhi({ ngay: '2026-07-21', loai: 'ra', thoiDiem: '2026-07-21T15:00:00Z', soPhutVeSom: 0 }),
    ]);
    expect(map.get(NV1)).toEqual({ diMuon: 0, veSom: 0 });
  });

  it('một ngày chỉ tính tối đa MỘT lần muộn và MỘT lần sớm', () => {
    const map = demMuonSom([
      banGhi({ loai: 'vao', thoiDiem: '2026-08-03T02:00:00Z', soPhutDiMuon: 60 }),
      banGhi({ loai: 'ra', thoiDiem: '2026-08-03T08:00:00Z', soPhutVeSom: 60 }),
    ]);
    expect(map.get(NV1)).toEqual({ diMuon: 1, veSom: 1 });
  });

  it('mỗi NGÀY đếm riêng — muộn hai ngày là hai lượt', () => {
    const map = demMuonSom([
      banGhi({ ngay: '2026-08-03', loai: 'vao', thoiDiem: '2026-08-03T02:00:00Z', soPhutDiMuon: 10 }),
      banGhi({ ngay: '2026-08-04', loai: 'vao', thoiDiem: '2026-08-04T02:00:00Z', soPhutDiMuon: 5 }),
    ]);
    expect(map.get(NV1)).toEqual({ diMuon: 2, veSom: 0 });
  });

  it('bản ghi tới không đúng thứ tự vẫn xếp theo thoiDiem, không theo thứ tự mảng', () => {
    const map = demMuonSom([
      banGhi({ loai: 'ra', thoiDiem: '2026-08-03T10:00:00Z', soPhutVeSom: 0 }),
      banGhi({ loai: 'vao', thoiDiem: '2026-08-03T01:00:00Z', soPhutDiMuon: 0 }),
      banGhi({ loai: 'ra', thoiDiem: '2026-08-03T09:00:00Z', soPhutVeSom: 60 }),
    ]);
    expect(map.get(NV1)).toEqual({ diMuon: 0, veSom: 0 });
  });

  it('dữ liệu cũ thiếu thoiDiem: giữ thứ tự mảng, không ném', () => {
    const map = demMuonSom([
      banGhi({ loai: 'vao', soPhutDiMuon: 15 }),
      banGhi({ loai: 'ra', soPhutVeSom: 30 }),
      banGhi({ loai: 'ra', soPhutVeSom: 0 }),
    ]);
    expect(map.get(NV1)).toEqual({ diMuon: 1, veSom: 0 });
  });

  it('bản ghi isActive=false bị bỏ qua kể cả khi là lượt cuối', () => {
    const map = demMuonSom([
      banGhi({ loai: 'ra', thoiDiem: '2026-08-03T09:00:00Z', soPhutVeSom: 60 }),
      banGhi({ loai: 'ra', thoiDiem: '2026-08-03T10:00:00Z', soPhutVeSom: 0, isActive: false }),
    ]);
    expect(map.get(NV1)).toEqual({ diMuon: 0, veSom: 1 });
  });

  it('hai nhân viên cùng ngày không lẫn vào nhau', () => {
    const map = demMuonSom([
      banGhi({ loai: 'vao', thoiDiem: '2026-08-03T02:00:00Z', soPhutDiMuon: 30 }),
      banGhi({ employeeId: NV2, loai: 'vao', thoiDiem: '2026-08-03T01:00:00Z', soPhutDiMuon: 0 }),
      banGhi({ employeeId: NV2, loai: 'ra', thoiDiem: '2026-08-03T09:00:00Z', soPhutVeSom: 45 }),
    ]);
    expect(map.get(NV1)).toEqual({ diMuon: 1, veSom: 0 });
    expect(map.get(NV2)).toEqual({ diMuon: 0, veSom: 1 });
  });
});

describe('tongGioOt', () => {
  it('cộng giờ OT của đơn đã duyệt trong tháng', () => {
    const map = tongGioOt(
      [
        don({ loaiDon: 'lam_them_gio', ngay: '2026-08-03', gioTu: '18:00', gioDen: '20:30' }),
        don({ loaiDon: 'lam_them_gio', ngay: '2026-08-04', gioTu: '18:00', gioDen: '19:00' }),
        don({ loaiDon: 'lam_them_gio', ngay: '2026-09-01', gioTu: '18:00', gioDen: '22:00' }),
        don({ loaiDon: 'lam_them_gio', ngay: '2026-08-05', gioTu: '18:00', gioDen: '20:00', trangThai: 'cho_duyet' }),
      ],
      '2026-08',
    );
    expect(map.get(NV1)).toBe(3.5);
  });

  it('không có đơn nào → map rỗng', () => {
    expect(tongGioOt([], '2026-08').size).toBe(0);
  });

  it('ca OT qua đêm không bị kẹp về 0', () => {
    const map = tongGioOt(
      [don({ loaiDon: 'lam_them_gio', ngay: '2026-08-03', gioTu: '22:00', gioDen: '02:00' })],
      '2026-08',
    );
    expect(map.get(NV1)).toBe(4);
  });

  it('ưu tiên soGioOt đã chốt trên đơn thay vì tính lại', () => {
    const map = tongGioOt(
      [
        don({
          loaiDon: 'lam_them_gio',
          ngay: '2026-08-03',
          gioTu: '18:00',
          gioDen: '20:00',
          soGioOt: 1.5, // HR đã điều chỉnh; số chốt phải thắng phép tính lại
        }),
      ],
      '2026-08',
    );
    expect(map.get(NV1)).toBe(1.5);
  });
});
