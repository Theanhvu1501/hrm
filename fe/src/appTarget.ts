/**
 * Seam để phân biệt app đang chạy ở dạng nào và có đang chạy trong Capacitor native không.
 * - Build web thường: VITE_APP_TARGET rỗng → "full", hành vi như cũ.
 * - Build để bọc Capacitor: `VITE_APP_TARGET=cham-cong npm run build` → boot thẳng chấm công.
 */
export type AppTarget = "full" | "cham-cong";

export const APP_TARGET: AppTarget =
  import.meta.env.VITE_APP_TARGET === "cham-cong" ? "cham-cong" : "full";

export const isChamCongApp = APP_TARGET === "cham-cong";

/** Trang chủ tùy theo target: app chấm công mở thẳng màn check-in. */
export function getHomePath(): string {
  return isChamCongApp ? "/toi/cham-cong" : "/";
}

/** True khi web bundle đang chạy trong vỏ Capacitor native (an toàn khi chưa cài Capacitor). */
export function isNativeApp(): boolean {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  return !!cap?.isNativePlatform?.();
}
