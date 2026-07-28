import { useEffect } from "react";
import {
  QuyPhepHandlerProvider,
  useQuyPhepHandler,
} from "./QuyPhepHandlerContext";
import { QuyPhepTable } from "./components/table/QuyPhepTable";
import { XemTruocModal } from "./components/XemTruocModal";
import { SoBienDongDrawer } from "./components/SoBienDongDrawer";

function QuyPhepPageInner() {
  const handler = useQuyPhepHandler();

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  return (
    <div className="space-y-3">
      <QuyPhepTable />
      <XemTruocModal />
      <SoBienDongDrawer />
    </div>
  );
}

const QuyPhepPage: React.FC = () => {
  return (
    <QuyPhepHandlerProvider>
      <QuyPhepPageInner />
    </QuyPhepHandlerProvider>
  );
};

export default QuyPhepPage;
