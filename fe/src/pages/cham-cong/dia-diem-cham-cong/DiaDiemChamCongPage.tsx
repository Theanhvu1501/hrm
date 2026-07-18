import { useEffect } from "react";
import {
  DiaDiemChamCongHandlerProvider,
  useDiaDiemChamCongHandler,
} from "./DiaDiemChamCongHandlerContext";
import { DiaDiemChamCongTable } from "./components/table/DiaDiemChamCongTable";
import { DiaDiemChamCongForm } from "./components/form/DiaDiemChamCongForm";

function DiaDiemChamCongPageInner() {
  const handler = useDiaDiemChamCongHandler();

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  return (
    <div className="space-y-3">
      <DiaDiemChamCongTable />
      <DiaDiemChamCongForm />
    </div>
  );
}

const DiaDiemChamCongPage: React.FC = () => {
  return (
    <DiaDiemChamCongHandlerProvider>
      <DiaDiemChamCongPageInner />
    </DiaDiemChamCongHandlerProvider>
  );
};

export default DiaDiemChamCongPage;
