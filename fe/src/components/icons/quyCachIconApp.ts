/**
 * Quy cách ô icon app — bản vẽ Pencil 10/09/2026.
 *
 * BẢN SAO Ở: identity-service/portal/src/components/quyCachIconApp.ts
 * Hai repo không dùng chung package; sửa một bên thì phải sửa bên kia, nếu
 * không hai nơi hiện icon khác nhau.
 *
 * Nguồn glyph: ke-toan-so/design/icons/<appId>.svg
 */

export interface MauApp {
  /** Màu đầu gradient — cũng là màu đặc dùng cho cỡ dưới 24px. */
  dau: string;
  /** Màu cuối gradient — cũng là màu bóng ô. */
  cuoi: string;
  /** Nền thẻ app trong modal chọn ứng dụng. */
  nen: string;
}

export const MAU_APP: Record<string, MauApp> = {
  'ke-toan': { dau: '#1FD1A3', cuoi: '#0E7490', nen: '#E9FBF5' },
  'giao-viec': { dau: '#4F8CFF', cuoi: '#7C3AED', nen: '#F0F3FF' },
  'nhan-su': { dau: '#FFA63D', cuoi: '#F2536D', nen: '#FFF3EC' },
};

/**
 * App chưa có trong bảng màu. Phải là tông trung tính riêng: quy cách cấm đặt
 * glyph app này lên màu app khác, nên tuyệt đối không rơi về màu của một app.
 */
export const MAU_LA: MauApp = { dau: '#8E8E93', cuoi: '#48484A', nen: '#F2F2F7' };

export function layMauApp(appId: string): MauApp {
  return MAU_APP[appId] ?? MAU_LA;
}

/** Dưới cỡ này thì gradient và lớp sáng thành nhiễu, không còn đọc ra hình. */
const NGUONG_GRADIENT = 24;

export interface QuyCachO {
  boGoc: number;
  glyph: number;
  nen: string;
  bong: string;
}

export function quyCachO(appId: string, size: number): QuyCachO {
  const mau = layMauApp(appId);
  const dacThoi = size < NGUONG_GRADIENT;

  return {
    boGoc: Math.round(size * 0.27),
    glyph: Math.round(size * 0.55),
    nen: dacThoi
      ? mau.dau
      : `radial-gradient(ellipse 67.5% 67.5% at 28% 12%, #FFFFFF66 0%, #FFFFFF00 100%), linear-gradient(305deg, ${mau.dau} 14%, ${mau.cuoi} 86%)`,
    bong: `0 5px 14px ${mau.cuoi}66`,
  };
}
