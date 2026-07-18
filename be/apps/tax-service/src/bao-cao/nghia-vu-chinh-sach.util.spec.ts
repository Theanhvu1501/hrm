import {
  buildNvcsSections,
  NvcsTndnQuy,
  NvcsTndnReport,
  NvcsVatQuy,
} from './nghia-vu-chinh-sach.util';

function tndnQuy(p: Partial<NvcsTndnQuy>): NvcsTndnQuy {
  return {
    dt511: 0,
    dt515: 0,
    dt711: 0,
    cp632: 0,
    cp641: 0,
    cp642: 0,
    cp811: 0,
    tongChiPhi: 0,
    lnTruocThue: 0,
    chiPhiKhongTru: 0,
    thuNhapTinhThue: 0,
    thueTNDN: 0,
    lnSauThue: 0,
    ...p,
  };
}

function vatQuy(p: Partial<NvcsVatQuy>): NvcsVatQuy {
  return { vatDauVao: 0, vatDauRa: 0, vatPhaiNop: 0, vatConKhauTru: 0, ...p };
}

describe('buildNvcsSections', () => {
  it('trả đúng 4 section TNDN/GTGT/TNCN/BHXH', () => {
    const tndn: NvcsTndnReport = {
      quy: [tndnQuy({}), tndnQuy({}), tndnQuy({}), tndnQuy({})],
      luyKe: tndnQuy({}),
    };
    const sections = buildNvcsSections(
      tndn,
      [vatQuy({}), vatQuy({}), vatQuy({}), vatQuy({})],
      {},
    );
    expect(sections.map((s) => s.ma)).toEqual(['TNDN', 'GTGT', 'TNCN', 'BHXH']);
    expect(sections[0].rows).toHaveLength(11);
    expect(sections[1].rows).toHaveLength(4);
    expect(sections[2].rows).toHaveLength(1);
    expect(sections[3].rows).toHaveLength(1);
  });

  it('ánh xạ TNDN: row1=dt511+dt515+dt711, row6=tongChiPhi, lũy kế từ tndn.luyKe', () => {
    const tndn: NvcsTndnReport = {
      quy: [
        tndnQuy({ dt511: 100, dt515: 10, dt711: 1, tongChiPhi: 50 }),
        tndnQuy({ dt511: 200, tongChiPhi: 60 }),
        tndnQuy({}),
        tndnQuy({}),
      ],
      luyKe: tndnQuy({ dt511: 300, dt515: 10, dt711: 1, tongChiPhi: 110 }),
    };
    const sections = buildNvcsSections(
      tndn,
      [vatQuy({}), vatQuy({}), vatQuy({}), vatQuy({})],
      {},
    );
    const tndnSec = sections[0];
    const row1 = tndnSec.rows[0];
    expect(row1.chiTieu).toBe('Doanh thu thuần');
    expect(row1.q1).toBe(111); // 100+10+1
    expect(row1.q2).toBe(200);
    expect(row1.luyKe).toBe(311); // 300+10+1
    const row6 = tndnSec.rows[5];
    expect(row6.chiTieu).toBe('Tổng CP phát sinh');
    expect(row6.q1).toBe(50);
    expect(row6.q2).toBe(60);
    expect(row6.luyKe).toBe(110);
  });

  it('GTGT VAT còn kỳ trước: Q1=0, Q2=vatConKhauTru của Q1, luyKe=0', () => {
    const tndn: NvcsTndnReport = {
      quy: [tndnQuy({}), tndnQuy({}), tndnQuy({}), tndnQuy({})],
      luyKe: tndnQuy({}),
    };
    const vat: NvcsVatQuy[] = [
      vatQuy({ vatDauRa: 500, vatDauVao: 300, vatPhaiNop: 200, vatConKhauTru: 0 }),
      vatQuy({ vatDauRa: 100, vatDauVao: 400, vatPhaiNop: 0, vatConKhauTru: 300 }),
      vatQuy({ vatDauRa: 50, vatDauVao: 20, vatPhaiNop: 30, vatConKhauTru: 0 }),
      vatQuy({ vatDauRa: 10, vatDauVao: 5, vatPhaiNop: 5, vatConKhauTru: 0 }),
    ];
    const gtgt = buildNvcsSections(tndn, vat, {}).find((s) => s.ma === 'GTGT')!;

    const conKyTruoc = gtgt.rows[0];
    expect(conKyTruoc.chiTieu).toBe('VAT còn kỳ trước');
    expect(conKyTruoc.q1).toBe(0);
    expect(conKyTruoc.q2).toBe(0); // vatConKhauTru của Q1 = 0
    expect(conKyTruoc.q3).toBe(300); // vatConKhauTru của Q2
    expect(conKyTruoc.luyKe).toBe(0);

    const banRa = gtgt.rows[1];
    expect(banRa.luyKe).toBe(660); // 500+100+50+10
    const muaVao = gtgt.rows[2];
    expect(muaVao.luyKe).toBe(725); // 300+400+20+5
    const phaiNop = gtgt.rows[3];
    expect(phaiNop.luyKe).toBe(235); // 200+0+30+5
  });

  it('VAT còn kỳ trước Q2 = vatConKhauTru của Q1 (khác 0)', () => {
    const tndn: NvcsTndnReport = {
      quy: [tndnQuy({}), tndnQuy({}), tndnQuy({}), tndnQuy({})],
      luyKe: tndnQuy({}),
    };
    const vat: NvcsVatQuy[] = [
      vatQuy({ vatConKhauTru: 777 }),
      vatQuy({}),
      vatQuy({}),
      vatQuy({}),
    ];
    const gtgt = buildNvcsSections(tndn, vat, {}).find((s) => s.ma === 'GTGT')!;
    expect(gtgt.rows[0].q2).toBe(777);
  });

  it('TNCN lũy kế = tổng 4 quý', () => {
    const tndn: NvcsTndnReport = {
      quy: [tndnQuy({}), tndnQuy({}), tndnQuy({}), tndnQuy({})],
      luyKe: tndnQuy({}),
    };
    const tncn = buildNvcsSections(
      tndn,
      [vatQuy({}), vatQuy({}), vatQuy({}), vatQuy({})],
      { thueTNCN: [10, 20, 30, 40] },
    ).find((s) => s.ma === 'TNCN')!;
    const row = tncn.rows[0];
    expect(row.q1).toBe(10);
    expect(row.q4).toBe(40);
    expect(row.luyKe).toBe(100);
  });

  it('BHXH = bhxh3383+bhyt3384+bhtn3386 mỗi quý, lũy kế = tổng 4 quý', () => {
    const tndn: NvcsTndnReport = {
      quy: [tndnQuy({}), tndnQuy({}), tndnQuy({}), tndnQuy({})],
      luyKe: tndnQuy({}),
    };
    const bhxh = buildNvcsSections(
      tndn,
      [vatQuy({}), vatQuy({}), vatQuy({}), vatQuy({})],
      {
        bhxh3383: [100, 100, 100, 100],
        bhyt3384: [10, 10, 10, 10],
        bhtn3386: [1, 1, 1, 1],
      },
    ).find((s) => s.ma === 'BHXH')!;
    const row = bhxh.rows[0];
    expect(row.q1).toBe(111); // 100+10+1
    expect(row.luyKe).toBe(444); // 111*4
  });
});
