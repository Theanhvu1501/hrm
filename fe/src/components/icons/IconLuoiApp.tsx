/** Lưới 9 chấm — nút mở màn chọn ứng dụng. */
export function IconLuoiApp({ size = 18 }: { size?: number }) {
  const toaDo = [4, 10, 16];
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden focusable="false">
      {toaDo.map((y) =>
        toaDo.map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.7" fill="currentColor" />),
      )}
    </svg>
  );
}

export default IconLuoiApp;
