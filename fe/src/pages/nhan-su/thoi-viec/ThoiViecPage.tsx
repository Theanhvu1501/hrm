import { useEffect } from "react";
import {
  ThoiViecHandlerProvider,
  useThoiViecHandler,
} from "./ThoiViecHandlerContext";
import { ThoiViecTable } from "./components/table/ThoiViecTable";
import { ThoiViecForm } from "./components/form/ThoiViecForm";

function ThoiViecPageInner() {
  const handler = useThoiViecHandler();

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  return (
    <div className="space-y-3">
      <ThoiViecTable />
      <ThoiViecForm />
    </div>
  );
}

const ThoiViecPage: React.FC = () => {
  return (
    <ThoiViecHandlerProvider>
      <ThoiViecPageInner />
    </ThoiViecHandlerProvider>
  );
};

export default ThoiViecPage;
