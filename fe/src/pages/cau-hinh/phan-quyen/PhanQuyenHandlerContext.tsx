import { createContext, useContext, useState, ReactNode } from "react";
import { PhanQuyenHandler, PhanQuyenStates } from "./phanQuyenHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const PhanQuyenHandlerContext = createContext<PhanQuyenHandler | null>(null);

export function PhanQuyenHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new PhanQuyenHandler());
  return (
    <PhanQuyenHandlerContext.Provider value={handler}>
      {children}
    </PhanQuyenHandlerContext.Provider>
  );
}

export function usePhanQuyenHandler() {
  const handler = useContext(PhanQuyenHandlerContext);
  if (!handler) {
    throw new Error("usePhanQuyenHandler must be used within PhanQuyenHandlerProvider");
  }
  return handler;
}

export function usePhanQuyenState<K extends StateKey<PhanQuyenStates>>(
  key: K,
  initialValue?: StateValue<PhanQuyenStates, K>
) {
  const handler = usePhanQuyenHandler();
  return useChandlerState<PhanQuyenStates, K>(key, handler, initialValue);
}
