import { useEffect } from "react";
import {
  BanGhiHandlerProvider,
  useBanGhiHandler,
} from "./BanGhiHandlerContext";
import { BanGhiTable } from "./components/table/BanGhiTable";
import { NhapBuForm } from "./components/form/NhapBuForm";

function BanGhiPageInner() {
  const handler = useBanGhiHandler();

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  return (
    <div className="space-y-3">
      <BanGhiTable />
      <NhapBuForm />
    </div>
  );
}

const BanGhiPage: React.FC = () => {
  return (
    <BanGhiHandlerProvider>
      <BanGhiPageInner />
    </BanGhiHandlerProvider>
  );
};

export default BanGhiPage;
