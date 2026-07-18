import { useEffect } from "react";
import {
  QuaTrinhCongTacHandlerProvider,
  useQuaTrinhCongTacHandler,
} from "./QuaTrinhCongTacHandlerContext";
import { QuaTrinhCongTacTable } from "./components/table/QuaTrinhCongTacTable";
import { QuaTrinhCongTacForm } from "./components/form/QuaTrinhCongTacForm";

function QuaTrinhCongTacPageInner() {
  const handler = useQuaTrinhCongTacHandler();

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  return (
    <div className="space-y-3">
      <QuaTrinhCongTacTable />
      <QuaTrinhCongTacForm />
    </div>
  );
}

const QuaTrinhCongTacPage: React.FC = () => {
  return (
    <QuaTrinhCongTacHandlerProvider>
      <QuaTrinhCongTacPageInner />
    </QuaTrinhCongTacHandlerProvider>
  );
};

export default QuaTrinhCongTacPage;
