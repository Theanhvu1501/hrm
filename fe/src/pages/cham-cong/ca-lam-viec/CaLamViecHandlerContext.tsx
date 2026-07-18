import { createContext, useContext, useState, ReactNode } from "react";
import { CaLamViecHandler, CaLamViecStates } from "./caLamViecHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const CaLamViecHandlerContext = createContext<CaLamViecHandler | null>(null);

export function CaLamViecHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new CaLamViecHandler());
  return (
    <CaLamViecHandlerContext.Provider value={handler}>
      {children}
    </CaLamViecHandlerContext.Provider>
  );
}

export function useCaLamViecHandler() {
  const handler = useContext(CaLamViecHandlerContext);
  if (!handler) {
    throw new Error(
      "useCaLamViecHandler must be used within CaLamViecHandlerProvider"
    );
  }
  return handler;
}

export function useCaLamViecState<K extends StateKey<CaLamViecStates>>(
  key: K,
  initialValue?: StateValue<CaLamViecStates, K>
) {
  const handler = useCaLamViecHandler();
  return useChandlerState<CaLamViecStates, K>(key, handler, initialValue);
}
