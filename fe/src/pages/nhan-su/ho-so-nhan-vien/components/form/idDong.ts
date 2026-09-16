/**
 * Khoá riêng cho một dòng con trong hồ sơ (bằng cấp, người phụ thuộc). Tệp
 * đính kèm bám theo khoá này chứ không theo vị trí trong mảng — xoá dòng đầu
 * là mọi vị trí phía sau tụt xuống một và tệp sẽ bám nhầm dòng.
 *
 * Sinh ở FE để đính kèm được NGAY khi vừa thêm dòng, trước cả lần lưu đầu
 * tiên. BE cũng gắn id cho dòng nào còn thiếu (`chuanHoaHoSo`) — hai lớp cho
 * cùng một bất biến, không lớp nào là chốt chặn duy nhất.
 */
export function idDong(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
