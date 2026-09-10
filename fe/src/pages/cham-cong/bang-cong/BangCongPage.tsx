import { useEffect } from "react";
import { Card } from "antd";
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
    <>
      <Card>
        <BangCongHeader />
        <BangCongTable />
        <BangCongLegend />
      </Card>
      <BangCongPrintView />
    </>
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
