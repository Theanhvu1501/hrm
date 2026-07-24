import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyManifestForPath } from "./employeeManifest";

/** Cập nhật <link rel="manifest"> theo route hiện tại. Không render UI. */
export default function ManifestSync() {
  const { pathname } = useLocation();
  useEffect(() => {
    applyManifestForPath(pathname);
  }, [pathname]);
  return null;
}
