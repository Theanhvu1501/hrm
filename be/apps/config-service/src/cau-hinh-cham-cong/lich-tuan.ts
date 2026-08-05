/**
 * Giải quyết lịch làm việc tuần THỰC SỰ áp cho một nhân viên — hàm thuần,
 * không DB, không NestJS.
 *
 * Tồn tại để 4 module (bảng công, quỹ phép, đơn từ, bản ghi chấm công) dùng
 * CHUNG một quy tắc thừa kế thay vì mỗi nơi tự đoán. Các hàm thuần hạ nguồn
 * (`suy-ky-hieu.ts`, `luat-don.ts`, `luat-phep.ts`) KHÔNG biết gì về cấu hình
 * công ty — chúng nhận lịch đã giải quyết và giữ nguyên quy ước cũ của mình.
 */

/**
 * Ba tầng, theo đúng thứ tự:
 *
 * 1. Nhân viên khai riêng (có phần tử) → dùng nó.
 * 2. Rỗng/chưa đặt → lịch chung của công ty.
 * 3. Công ty cũng rỗng → `undefined`.
 *
 * Tầng 3 trả `undefined` chứ KHÔNG `[]`, và đó là điểm dễ sửa sai nhất file
 * này: mọi hàm hạ nguồn quy ước "lịch rỗng/undefined = chưa cấu hình ⇒ mọi
 * ngày đều là ngày làm việc". Trả `[]` sẽ được hiểu ngược lại thành "không
 * ngày nào là ngày làm việc" ở những nhánh chỉ kiểm `includes()`, tức là âm
 * thầm xoá sạch công của cả công ty.
 */
export function lichTuanApDung(
  emp: { ngayLamViecTrongTuan?: number[] } | null | undefined,
  chung: number[] | undefined,
): number[] | undefined {
  const rieng = emp?.ngayLamViecTrongTuan;
  if (rieng && rieng.length > 0) return rieng;
  if (chung && chung.length > 0) return chung;
  return undefined;
}
