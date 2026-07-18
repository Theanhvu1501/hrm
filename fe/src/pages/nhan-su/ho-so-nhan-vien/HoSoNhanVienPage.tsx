import { useEffect } from "react";
import {
  HoSoNhanVienHandlerProvider,
  useHoSoNhanVienHandler,
} from "./HoSoNhanVienHandlerContext";
import { HoSoNhanVienTable } from "./components/table/HoSoNhanVienTable";
import { HoSoNhanVienForm } from "./components/form/HoSoNhanVienForm";

function HoSoNhanVienPageInner() {
  const handler = useHoSoNhanVienHandler();

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  return (
    <div className="space-y-3">
      <HoSoNhanVienTable />
      <HoSoNhanVienForm />
    </div>
  );
}

const HoSoNhanVienPage: React.FC = () => {
  return (
    <HoSoNhanVienHandlerProvider>
      <HoSoNhanVienPageInner />
    </HoSoNhanVienHandlerProvider>
  );
};

export default HoSoNhanVienPage;
