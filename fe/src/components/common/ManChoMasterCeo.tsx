/**
 * Màn chờ toàn trang mang nhận diện MasterCeo.
 *
 * Dùng lại đúng dải 2px của `BangDuLieu` thay vì vẽ một vòng quay riêng: dải đó
 * đã là ngôn ngữ "đang tải" ở 26 trang danh mục, cả app nói cùng một thứ tiếng
 * thì đỡ rối hơn mỗi chỗ một kiểu.
 *
 * Ảnh dấu M nằm ở `public/` (không đi qua bundle) để hiện được sớm nhất có thể.
 * Hiện là ảnh raster tách từ logo.jpg; có `masterceo-mark.svg` thì thay đúng
 * file này, không phải sửa code.
 */
export function ManChoMasterCeo({ chu = 'Đang tải…' }: { chu?: string }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background"
      role="status"
      aria-live="polite"
    >
      <img
        src="/masterceo-mark.png"
        alt="MasterCeo"
        width={64}
        height={64}
        className="mc-cho-tho"
      />
      <div className="mc-cho-dai" aria-hidden />
      <p className="text-sm text-muted-foreground">{chu}</p>
    </div>
  );
}

export default ManChoMasterCeo;
