import { useEffect } from "react";
import { PhanQuyenHandlerProvider, usePhanQuyenHandler } from "./PhanQuyenHandlerContext";
import { PhanQuyenHeader } from "./components/header/PhanQuyenHeader";
import { PermissionMatrix } from "./components/matrix/PermissionMatrix";
import { PhanQuyenFooter } from "./components/footer/PhanQuyenFooter";
import { usePagePermission } from "@/hooks/usePagePermission";

function PhanQuyenPageInner() {
  const handler = usePhanQuyenHandler();
  const { canEdit } = usePagePermission("/cau-hinh/phan-quyen");

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PhanQuyenHeader />
      <div style={{ flex: 1, minHeight: 0 }}>
        <PermissionMatrix />
      </div>
      {canEdit && <PhanQuyenFooter />}
    </div>
  );
}

const PhanQuyenPage: React.FC = () => {
  return (
    <PhanQuyenHandlerProvider>
      <PhanQuyenPageInner />
    </PhanQuyenHandlerProvider>
  );
};

export default PhanQuyenPage;
