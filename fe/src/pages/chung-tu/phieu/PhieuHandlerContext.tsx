import { createContext, useContext, useState, ReactNode } from "react";
import { PhieuHandler, PhieuStates } from "./phieu.handler";
import { PhieuConfig } from "./phieuConfig";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const PhieuHandlerContext = createContext<PhieuHandler | null>(null);
const PhieuConfigContext = createContext<PhieuConfig | null>(null);

export function PhieuHandlerProvider({ config, children }: { config: PhieuConfig; children: ReactNode }) {
  const [handler] = useState(() => new PhieuHandler());
  return (
    <PhieuConfigContext.Provider value={config}>
      <PhieuHandlerContext.Provider value={handler}>{children}</PhieuHandlerContext.Provider>
    </PhieuConfigContext.Provider>
  );
}

export function usePhieuHandler() {
  const handler = useContext(PhieuHandlerContext);
  if (!handler) throw new Error("usePhieuHandler must be used within PhieuHandlerProvider");
  return handler;
}

export function usePhieuConfig() {
  const config = useContext(PhieuConfigContext);
  if (!config) throw new Error("usePhieuConfig must be used within PhieuHandlerProvider");
  return config;
}

export function usePhieuState<K extends StateKey<PhieuStates>>(
  key: K,
  initialValue?: StateValue<PhieuStates, K>,
) {
  const handler = usePhieuHandler();
  return useChandlerState<PhieuStates, K>(key, handler, initialValue);
}
