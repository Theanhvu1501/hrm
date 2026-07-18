import { LoaiChungTu } from "@/types";
import { phieuThuService, phieuChiService, PhieuService } from "@/services/phieuService";

export interface PhieuConfig {
  loai: LoaiChungTu;
  title: string;
  soPhieuPrefix: string;
  service: PhieuService;
  accentClass: string;
}

export const PHIEU_CONFIG: Record<LoaiChungTu, PhieuConfig> = {
  PHIEU_THU: {
    loai: "PHIEU_THU",
    title: "Phiếu thu",
    soPhieuPrefix: "PT",
    service: phieuThuService,
    accentClass: "text-emerald-600",
  },
  PHIEU_CHI: {
    loai: "PHIEU_CHI",
    title: "Phiếu chi",
    soPhieuPrefix: "PC",
    service: phieuChiService,
    accentClass: "text-rose-600",
  },
};
