import { useEffect } from "react";
import {
  ThietBiHandlerProvider,
  useThietBiHandler,
} from "./ThietBiHandlerContext";
import { ThietBiTable } from "./components/table/ThietBiTable";

function ThietBiPageInner() {
  const handler = useThietBiHandler();

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  return (
    <div className="space-y-3">
      <ThietBiTable />
    </div>
  );
}

const ThietBiPage: React.FC = () => {
  return (
    <ThietBiHandlerProvider>
      <ThietBiPageInner />
    </ThietBiHandlerProvider>
  );
};

export default ThietBiPage;
