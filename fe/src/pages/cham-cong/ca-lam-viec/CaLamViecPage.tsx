import { useEffect } from "react";
import {
  CaLamViecHandlerProvider,
  useCaLamViecHandler,
} from "./CaLamViecHandlerContext";
import { CaLamViecTable } from "./components/table/CaLamViecTable";
import { CaLamViecForm } from "./components/form/CaLamViecForm";

function CaLamViecPageInner() {
  const handler = useCaLamViecHandler();

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  return (
    <div className="space-y-3">
      <CaLamViecTable />
      <CaLamViecForm />
    </div>
  );
}

const CaLamViecPage: React.FC = () => {
  return (
    <CaLamViecHandlerProvider>
      <CaLamViecPageInner />
    </CaLamViecHandlerProvider>
  );
};

export default CaLamViecPage;
