import { useCallback } from "react";
import { ChungTu } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { usePhieuConfig, usePhieuState } from "../PhieuHandlerContext";
import { printPhieu } from "./printPhieu";
import { getDefaultTemplate } from "./printTemplates";

/**
 * Hook trả về hàm in/xuất PDF cho 1 phiếu. Ưu tiên mẫu in đã upload
 * (state `printTemplate`, do Part D nạp), không có thì dùng mẫu mặc định
 * theo loại phiếu. Tên công ty lấy từ tenant hiện tại.
 */
export function usePrintPhieu() {
  const config = usePhieuConfig();
  const { currentTenant } = useAuth();
  const [printTemplate] = usePhieuState("printTemplate", null);

  return useCallback(
    (phieu: ChungTu) => {
      const template = printTemplate || getDefaultTemplate(config.loai);
      printPhieu(phieu, template, {
        tenCongTy: currentTenant?.tenantName ?? "",
        diaChiCongTy: "",
      });
    },
    [config.loai, printTemplate, currentTenant]
  );
}
