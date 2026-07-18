import { useEffect } from "react";
import {
  HopDongLaoDongHandlerProvider,
  useHopDongLaoDongHandler,
} from "./HopDongLaoDongHandlerContext";
import { HopDongLaoDongTable } from "./components/table/HopDongLaoDongTable";
import { HopDongLaoDongForm } from "./components/form/HopDongLaoDongForm";

function HopDongLaoDongPageInner() {
  const handler = useHopDongLaoDongHandler();

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  return (
    <div className="space-y-3">
      <HopDongLaoDongTable />
      <HopDongLaoDongForm />
    </div>
  );
}

const HopDongLaoDongPage: React.FC = () => {
  return (
    <HopDongLaoDongHandlerProvider>
      <HopDongLaoDongPageInner />
    </HopDongLaoDongHandlerProvider>
  );
};

export default HopDongLaoDongPage;
