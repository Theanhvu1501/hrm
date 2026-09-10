import type { TableProps } from 'antd';

/** Bù trừ dọc mặc định — trang danh mục chuẩn: breadcrumb + FilterBar + phân trang. */
export const BU_TRU_DOC_MAC_DINH = 285;

/**
 * Chuẩn cuộn dùng chung cho bảng danh mục.
 *
 * `x: 'max-content'` thay cho các số 700/800/900/1400/1600 rải rác trước đây:
 * bảng ít cột không bị giãn toác, bảng nhiều cột vẫn cuộn ngang được — điều kiện
 * bắt buộc để cột ghim của antd hoạt động.
 *
 * Giá trị trang truyền vào luôn thắng, và thắng theo TỪNG khoá, nên trang chỉ
 * muốn đổi `x` thì không phải khai lại `y`.
 */
export function tinhScroll(
  buTruDoc: number,
  scroll?: TableProps<Record<string, unknown>>['scroll'],
) {
  return { x: 'max-content', y: `calc(100vh - ${buTruDoc}px)`, ...scroll };
}
