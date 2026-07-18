import { useEffect } from "react";
import {
  DonChamCongHandlerProvider,
  useDonChamCongHandler,
} from "./DonChamCongHandlerContext";
import { DonChamCongTable } from "./components/table/DonChamCongTable";
import { DonChamCongForm } from "./components/form/DonChamCongForm";

function DonChamCongPageInner() {
  const handler = useDonChamCongHandler();

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  return (
    <div className="space-y-3">
      <DonChamCongTable />
      <DonChamCongForm />
    </div>
  );
}

const DonChamCongPage: React.FC = () => {
  return (
    <DonChamCongHandlerProvider>
      <DonChamCongPageInner />
    </DonChamCongHandlerProvider>
  );
};

export default DonChamCongPage;
