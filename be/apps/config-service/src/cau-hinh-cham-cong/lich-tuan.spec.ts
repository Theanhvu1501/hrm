import { lichTuanApDung } from './lich-tuan';

describe('lichTuanApDung', () => {
  const CHUNG = [1, 2, 3, 4, 5];

  it('khai riêng thắng lịch chung', () => {
    expect(lichTuanApDung({ ngayLamViecTrongTuan: [1, 2, 3, 4, 5, 6] }, CHUNG))
      .toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('khai riêng rỗng thì rơi về lịch chung', () => {
    expect(lichTuanApDung({ ngayLamViecTrongTuan: [] }, CHUNG)).toEqual(CHUNG);
  });

  it('khai riêng undefined thì rơi về lịch chung', () => {
    expect(lichTuanApDung({}, CHUNG)).toEqual(CHUNG);
  });

  it('nhân viên null/undefined vẫn rơi về lịch chung, không ném', () => {
    expect(lichTuanApDung(null, CHUNG)).toEqual(CHUNG);
    expect(lichTuanApDung(undefined, CHUNG)).toEqual(CHUNG);
  });

  it('cả hai rỗng thì trả undefined — đáy "mọi ngày là ngày làm việc", KHÔNG phải "nghỉ tất cả"', () => {
    expect(lichTuanApDung({}, undefined)).toBeUndefined();
    expect(lichTuanApDung({ ngayLamViecTrongTuan: [] }, [])).toBeUndefined();
  });

  it('Chủ nhật (0) trong khai riêng không bị hiểu nhầm là falsy', () => {
    expect(lichTuanApDung({ ngayLamViecTrongTuan: [0] }, CHUNG)).toEqual([0]);
  });
});
