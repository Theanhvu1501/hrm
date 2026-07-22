import { createContext, useContext, useState, ReactNode } from "react";
import { BanGhiHandler, BanGhiStates } from "./banGhiHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const BanGhiHandlerContext = createContext<BanGhiHandler | null>(null);

export function BanGhiHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new BanGhiHandler());
  return (
    <BanGhiHandlerContext.Provider value={handler}>
      {children}
    </BanGhiHandlerContext.Provider>
  );
}

export function useBanGhiHandler() {
  const handler = useContext(BanGhiHandlerContext);
  if (!handler) {
    throw new Error("useBanGhiHandler must be used within BanGhiHandlerProvider");
  }
  return handler;
}

export function useBanGhiState<K extends StateKey<BanGhiStates>>(
  key: K,
  initialValue?: StateValue<BanGhiStates, K>
) {
  const handler = useBanGhiHandler();
  return useChandlerState<BanGhiStates, K>(key, handler, initialValue);
}
