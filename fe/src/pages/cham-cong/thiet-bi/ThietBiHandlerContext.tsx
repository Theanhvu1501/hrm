import { createContext, useContext, useState, ReactNode } from "react";
import { ThietBiHandler, ThietBiStates } from "./thietBiHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const ThietBiHandlerContext = createContext<ThietBiHandler | null>(null);

export function ThietBiHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new ThietBiHandler());
  return (
    <ThietBiHandlerContext.Provider value={handler}>
      {children}
    </ThietBiHandlerContext.Provider>
  );
}

export function useThietBiHandler() {
  const handler = useContext(ThietBiHandlerContext);
  if (!handler) {
    throw new Error("useThietBiHandler must be used within ThietBiHandlerProvider");
  }
  return handler;
}

export function useThietBiState<K extends StateKey<ThietBiStates>>(
  key: K,
  initialValue?: StateValue<ThietBiStates, K>
) {
  const handler = useThietBiHandler();
  return useChandlerState<ThietBiStates, K>(key, handler, initialValue);
}
