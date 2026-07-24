/**
 * Tráo <link rel="manifest"> và apple title theo route để vỏ nhân viên /toi cài được
 * thành app PWA riêng "Chấm công", còn phần còn lại vẫn là app "Nhân sự".
 * Thuần DOM, idempotent, an toàn khi thẻ chưa tồn tại (dev / test).
 */
const CHAMCONG_MANIFEST = "/manifest.chamcong.webmanifest";
const DEFAULT_MANIFEST = "/manifest.webmanifest";
const APPLE_TITLE = "apple-mobile-web-app-title";

function ensureManifestLink(): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "manifest";
    document.head.appendChild(link);
  }
  return link;
}

function ensureAppleTitleMeta(): HTMLMetaElement {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${APPLE_TITLE}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = APPLE_TITLE;
    document.head.appendChild(meta);
  }
  return meta;
}

export function applyManifestForPath(pathname: string): void {
  const isEmployee = pathname.startsWith("/toi");
  ensureManifestLink().setAttribute(
    "href",
    isEmployee ? CHAMCONG_MANIFEST : DEFAULT_MANIFEST,
  );
  ensureAppleTitleMeta().setAttribute("content", isEmployee ? "Chấm công" : "Nhân sự");
}
