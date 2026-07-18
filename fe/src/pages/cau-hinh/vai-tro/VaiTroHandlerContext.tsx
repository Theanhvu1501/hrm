import { createContext, useContext, useState, ReactNode } from "react";
import { VaiTroHandler, VaiTroStates } from "./vaiTroHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const VaiTroHandlerContext = createContext<VaiTroHandler | null>(null);

export function VaiTroHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new VaiTroHandler());
  return (
    <VaiTroHandlerContext.Provider value={handler}>
      {children}
    </VaiTroHandlerContext.Provider>
  );
}

export function useVaiTroHandler() {
  const handler = useContext(VaiTroHandlerContext);
  if (!handler) {
    throw new Error("useVaiTroHandler must be used within VaiTroHandlerProvider");
  }
  return handler;
}

export function useVaiTroState<K extends StateKey<VaiTroStates>>(
  key: K,
  initialValue?: StateValue<VaiTroStates, K>
) {
  const handler = useVaiTroHandler();
  return useChandlerState<VaiTroStates, K>(key, handler, initialValue);
}
