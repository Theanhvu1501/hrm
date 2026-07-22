import { useEffect } from "react";
import {
  NgayLeHandlerProvider,
  useNgayLeHandler,
} from "./NgayLeHandlerContext";
import { NgayLeTable } from "./components/table/NgayLeTable";
import { NgayLeForm } from "./components/form/NgayLeForm";

function NgayLePageInner() {
  const handler = useNgayLeHandler();

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  return (
    <div className="space-y-3">
      <NgayLeTable />
      <NgayLeForm />
    </div>
  );
}

const NgayLePage: React.FC = () => {
  return (
    <NgayLeHandlerProvider>
      <NgayLePageInner />
    </NgayLeHandlerProvider>
  );
};

export default NgayLePage;
