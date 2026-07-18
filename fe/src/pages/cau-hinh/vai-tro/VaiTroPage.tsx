import { useEffect, useState } from "react";
import { VaiTroHandlerProvider, useVaiTroHandler } from "./VaiTroHandlerContext";
import { VaiTroHeader } from "./components/header/VaiTroHeader";
import { VaiTroTable } from "./components/table/VaiTroTable";
import { VaiTroModal } from "./components/modal/VaiTroModal";

function VaiTroPageInner() {
  const handler = useVaiTroHandler();
  const [settingsButton, setSettingsButton] = useState<React.ReactNode>(null);

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  return (
    <div className="space-y-3">
      <VaiTroHeader settingsButton={settingsButton} />
      <VaiTroTable onSettingsButton={setSettingsButton} />
      <VaiTroModal />
    </div>
  );
}

const VaiTroPage: React.FC = () => {
  return (
    <VaiTroHandlerProvider>
      <VaiTroPageInner />
    </VaiTroHandlerProvider>
  );
};

export default VaiTroPage;
