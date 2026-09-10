import { Table } from 'antd';
import type { TableProps } from 'antd';
import { BU_TRU_DOC_MAC_DINH, tinhScroll } from './chuanBang';

export type BangDuLieuProps<T> = Omit<TableProps<T>, 'loading'> & {
  /** Đang nạp dữ liệu. KHÔNG truyền xuống antd — xem chú thích dưới. */
  loading?: boolean;
  /** Số px trừ khỏi 100vh để ra chiều cao vùng cuộn. Trang có thẻ thống kê
   *  phía trên thì truyền số lớn hơn. */
  buTruDoc?: number;
};

/**
 * Bảng dùng chung của các trang danh mục.
 *
 * Khác antd ở hai chỗ:
 *
 * 1. `loading` KHÔNG đi xuống `Table`. Spinner của antd che bảng và làm mờ dữ
 *    liệu đang xem; ở đây dữ liệu cũ nằm nguyên, chỉ có dải 2px chạy trên đầu.
 *    Kể cả lần tải đầu cũng vậy — không có nhánh skeleton.
 * 2. Đặt sẵn `size="small"` và chuẩn `scroll`, để 26 trang danh mục trông
 *    giống nhau thay vì mỗi trang một kiểu.
 *
 * Trang vẫn ghi đè được mọi prop (đổ `...props` sau), nhưng đừng ghi đè `size` —
 * đồng nhất dòng nhỏ chính là mục tiêu.
 */
export function BangDuLieu<T extends object>({
  loading = false,
  buTruDoc = BU_TRU_DOC_MAC_DINH,
  scroll,
  locale,
  ...props
}: BangDuLieuProps<T>) {
  const chuaCoDong = !props.dataSource || props.dataSource.length === 0;

  // Lần tải đầu bảng còn rỗng: để antd báo "không có dữ liệu" lúc này là nói sai,
  // vì chưa biết có hay không. Im lặng cho tới khi dữ liệu về.
  const localeHieuLuc = loading && chuaCoDong ? { ...locale, emptyText: ' ' } : locale;

  return (
    <div aria-busy={loading || undefined}>
      <div className="bdl-thanh" data-dang-tai={loading ? '1' : '0'} />
      <Table<T>
        size="small"
        scroll={tinhScroll(buTruDoc, scroll)}
        locale={localeHieuLuc}
        {...props}
      />
    </div>
  );
}

export default BangDuLieu;
