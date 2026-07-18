import 'reflect-metadata';
import { buildMongoQuery } from './build-query.helper';
import { NhatKyChungQueryDto } from '../dto';

type OrClause = Record<string, { $regex: string; $options: string }>;

const orFields = (search: string): string[] => {
  const query = buildMongoQuery({ search } as NhatKyChungQueryDto);
  return ((query.$or as OrClause[]) ?? []).flatMap((clause) =>
    Object.keys(clause),
  );
};

describe('buildMongoQuery', () => {
  describe('search', () => {
    it('should search on mã và tên đối tượng (cả doiTuong và doiTuong2)', () => {
      expect(orFields('0104918404-002')).toEqual(
        expect.arrayContaining([
          'danhMuc.doiTuong.ma',
          'danhMuc.doiTuong.ten',
          'danhMuc.doiTuong2.ma',
          'danhMuc.doiTuong2.ten',
        ]),
      );
    });

    it('should keep searching on nghiệp vụ, nội dung, số phiếu', () => {
      expect(orFields('abc')).toEqual(
        expect.arrayContaining([
          'danhMuc.nghiepVu.ten',
          'danhMuc.nghiepVu.ma',
          'noiDung',
          'soPhieu',
        ]),
      );
    });

    it('should escape regex metacharacters in search text', () => {
      const query = buildMongoQuery({
        search: '0104918404-002',
      } as NhatKyChungQueryDto);
      const clause = (query.$or as OrClause[]).find(
        (c) => c['danhMuc.doiTuong.ma'],
      );
      expect(clause?.['danhMuc.doiTuong.ma']).toEqual({
        $regex: '0104918404-002',
        $options: 'i',
      });
    });

    it('should not add $or when search is empty', () => {
      expect(buildMongoQuery({} as NhatKyChungQueryDto).$or).toBeUndefined();
    });
  });

  describe('doiTuong filter', () => {
    it('should match đối tượng ở bên Nợ hoặc bên Có', () => {
      const query = buildMongoQuery({
        doiTuong: '0104918404-002',
      } as NhatKyChungQueryDto);
      expect(query.$or).toEqual([
        { 'danhMuc.doiTuong.ma': '0104918404-002' },
        { 'danhMuc.doiTuong2.ma': '0104918404-002' },
      ]);
    });

    it('should not collapse into an exact match on đối tượng Nợ only', () => {
      const query = buildMongoQuery({
        doiTuong: '0104918404-002',
      } as NhatKyChungQueryDto);
      expect(query['danhMuc.doiTuong.ma']).toBeUndefined();
    });

    it('should keep search and doiTuong as independent AND conditions', () => {
      const query = buildMongoQuery({
        search: 'THUE GTGT',
        doiTuong: '0104918404-002',
      } as NhatKyChungQueryDto);

      // Cả hai đều dùng $or — phải gói trong $and, không được ghi đè nhau
      expect(query.$or).toBeUndefined();
      const and = query.$and as Array<{ $or: unknown[] }>;
      expect(and).toHaveLength(2);
      expect(and[0].$or).toHaveLength(8); // search: 4 field cũ + 4 field đối tượng
      expect(and[1].$or).toEqual([
        { 'danhMuc.doiTuong.ma': '0104918404-002' },
        { 'danhMuc.doiTuong2.ma': '0104918404-002' },
      ]);
    });

    it('should combine doiTuong with other exact filters', () => {
      const query = buildMongoQuery({
        doiTuong: '0104918404-002',
        taiKhoanNo: '1331',
      } as NhatKyChungQueryDto);
      expect(query['danhMuc.taiKhoanNo.ma']).toBe('1331');
      expect(query.$or).toHaveLength(2);
    });
  });
});
