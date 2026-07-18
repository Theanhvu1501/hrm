import { useEffect } from "react";
import {
  BangCongHandlerProvider,
  useBangCongHandler,
} from "./BangCongHandlerContext";
import { BangCongHeader } from "./components/header/BangCongHeader";
import { BangCongTable } from "./components/table/BangCongTable";
import { BangCongLegend } from "./components/legend/BangCongLegend";
import { BangCongPrintView } from "./components/print/BangCongPrintView";
import "./bangCongPrint.css";

function BangCongPageInner() {
  const handler = useBangCongHandler();

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  return (
    <div className="space-y-3">
      <BangCongHeader />
      <BangCongTable />
      <BangCongLegend />
      <BangCongPrintView />
    </div>
  );
}

const BangCongPage: React.FC = () => {
  return (
    <BangCongHandlerProvider>
      <BangCongPageInner />
    </BangCongHandlerProvider>
  );
};

export default BangCongPage;
