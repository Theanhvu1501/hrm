/**
 * Trích xuất YouTube video id (11 ký tự) từ các dạng URL phổ biến.
 * Hỗ trợ: watch?v=, youtu.be/, /embed/, /shorts/. Trả null nếu không hợp lệ.
 */
export function parseYoutubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}
