import { useEffect } from "react";
import { NhatKyChungHandlerProvider, useNhatKyChungHandler } from "./NhatKyChungHandlerContext";
import { DataTabs } from "./components/data-tabs/DataTabs";
import { EntryFormModal } from "./components/entry-form-modal/EntryFormModal";
import { EntryViewModal } from "./components/entry-view-modal/EntryViewModal";

function NhatKyChungPageInner() {
  const handler = useNhatKyChungHandler();

  useEffect(() => {
    handler.executeEvent("init", {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="nkc-page">
      <DataTabs />
      <EntryFormModal />
      <EntryViewModal />
    </div>
  );
}

const NhatKyChungPage: React.FC = () => {
  return (
    <NhatKyChungHandlerProvider>
      <NhatKyChungPageInner />
    </NhatKyChungHandlerProvider>
  );
};

export default NhatKyChungPage;
