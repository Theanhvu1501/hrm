import { useEffect } from "react";
import { QuyGioHandlerProvider, useQuyGioHandler } from "./QuyGioHandlerContext";
import { QuyGioTable } from "./components/table/QuyGioTable";

function QuyGioPageInner() {
  const handler = useQuyGioHandler();

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  return (
    <div className="space-y-3">
      <QuyGioTable />
    </div>
  );
}

const QuyGioPage: React.FC = () => {
  return (
    <QuyGioHandlerProvider>
      <QuyGioPageInner />
    </QuyGioHandlerProvider>
  );
};

export default QuyGioPage;
