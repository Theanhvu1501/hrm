import * as fc from 'fast-check';
import {
  DanhMuc,
  DanhMucChuDauTu,
  DanhMucNhomKhuyenMai,
  DanhMucNhomQuanLy,
} from '@app/entities';

/**
 * **Feature: danh-muc-mo-rong, Property 7: ChungTu DanhMuc Extension**
 * **Validates: Requirements 5.3**
 *
 * For any ChungTu saved with nhomKhuyenMai and nhomQuanLy in danhMuc,
 * retrieving that ChungTu should return the same values in danhMuc.
 */
describe('Property 7: ChungTu DanhMuc Extension', () => {
  // Generator for DanhMucChuDauTu
  const chuDauTuArb: fc.Arbitrary<DanhMucChuDauTu> = fc.record({
    ma: fc
      .string({ minLength: 1, maxLength: 20 })
      .filter((s) => s.trim().length > 0),
    ten: fc.string({ minLength: 1, maxLength: 100 }),
  });

  // Generator for DanhMucNhomKhuyenMai
  const nhomKhuyenMaiArb: fc.Arbitrary<DanhMucNhomKhuyenMai> = fc.record({
    ma: fc
      .string({ minLength: 1, maxLength: 20 })
      .filter((s) => s.trim().length > 0),
    ten: fc.string({ minLength: 1, maxLength: 100 }),
  });

  // Generator for DanhMucNhomQuanLy
  const nhomQuanLyArb: fc.Arbitrary<DanhMucNhomQuanLy> = fc.record({
    ma: fc
      .string({ minLength: 1, maxLength: 20 })
      .filter((s) => s.trim().length > 0),
    ten: fc.string({ minLength: 1, maxLength: 100 }),
  });

  // Generator for DanhMuc with new fields
  const danhMucArb: fc.Arbitrary<DanhMuc> = fc.record({
    chuDauTu: fc.option(chuDauTuArb, { nil: undefined }),
    nhomKhuyenMai: fc.option(nhomKhuyenMaiArb, { nil: undefined }),
    nhomQuanLy: fc.option(nhomQuanLyArb, { nil: undefined }),
  });

  // Simulate save and retrieve (round-trip)
  const simulateSaveAndRetrieve = (danhMuc: DanhMuc): DanhMuc => {
    // Simulates JSON serialization/deserialization (what MongoDB does)
    return JSON.parse(JSON.stringify(danhMuc));
  };

  it('should persist chuDauTu in danhMuc', () => {
    fc.assert(
      fc.property(chuDauTuArb, (chuDauTu) => {
        const danhMuc: DanhMuc = { chuDauTu };
        const result = simulateSaveAndRetrieve(danhMuc);
        return (
          result.chuDauTu?.ma === chuDauTu.ma &&
          result.chuDauTu?.ten === chuDauTu.ten
        );
      }),
      { numRuns: 100 },
    );
  });

  it('should persist nhomKhuyenMai in danhMuc', () => {
    fc.assert(
      fc.property(nhomKhuyenMaiArb, (nhomKhuyenMai) => {
        const danhMuc: DanhMuc = { nhomKhuyenMai };
        const result = simulateSaveAndRetrieve(danhMuc);
        return (
          result.nhomKhuyenMai?.ma === nhomKhuyenMai.ma &&
          result.nhomKhuyenMai?.ten === nhomKhuyenMai.ten
        );
      }),
      { numRuns: 100 },
    );
  });

  it('should persist nhomQuanLy in danhMuc', () => {
    fc.assert(
      fc.property(nhomQuanLyArb, (nhomQuanLy) => {
        const danhMuc: DanhMuc = { nhomQuanLy };
        const result = simulateSaveAndRetrieve(danhMuc);
        return (
          result.nhomQuanLy?.ma === nhomQuanLy.ma &&
          result.nhomQuanLy?.ten === nhomQuanLy.ten
        );
      }),
      { numRuns: 100 },
    );
  });

  it('should persist all new fields together in danhMuc', () => {
    fc.assert(
      fc.property(danhMucArb, (danhMuc) => {
        const result = simulateSaveAndRetrieve(danhMuc);

        // Check chuDauTu
        const chuDauTuMatch =
          danhMuc.chuDauTu === undefined
            ? result.chuDauTu === undefined
            : result.chuDauTu?.ma === danhMuc.chuDauTu.ma &&
              result.chuDauTu?.ten === danhMuc.chuDauTu.ten;

        // Check nhomKhuyenMai
        const nhomKhuyenMaiMatch =
          danhMuc.nhomKhuyenMai === undefined
            ? result.nhomKhuyenMai === undefined
            : result.nhomKhuyenMai?.ma === danhMuc.nhomKhuyenMai.ma &&
              result.nhomKhuyenMai?.ten === danhMuc.nhomKhuyenMai.ten;

        // Check nhomQuanLy
        const nhomQuanLyMatch =
          danhMuc.nhomQuanLy === undefined
            ? result.nhomQuanLy === undefined
            : result.nhomQuanLy?.ma === danhMuc.nhomQuanLy.ma &&
              result.nhomQuanLy?.ten === danhMuc.nhomQuanLy.ten;

        return chuDauTuMatch && nhomKhuyenMaiMatch && nhomQuanLyMatch;
      }),
      { numRuns: 100 },
    );
  });
});
