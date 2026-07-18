import { createContext, useContext, useState, ReactNode } from "react";
import { NhatKyChungHandler, NhatKyChungStates } from "./handler/nhat-ky-chung.handler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const NhatKyChungHandlerContext = createContext<NhatKyChungHandler | null>(null);

export function NhatKyChungHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new NhatKyChungHandler());

  return (
    <NhatKyChungHandlerContext.Provider value={handler}>
      {children}
    </NhatKyChungHandlerContext.Provider>
  );
}

export function useNhatKyChungHandler() {
  const handler = useContext(NhatKyChungHandlerContext);
  if (!handler) {
    throw new Error("useNhatKyChungHandler must be used within NhatKyChungHandlerProvider");
  }
  return handler;
}

export function useNhatKyChungState<K extends StateKey<NhatKyChungStates>>(
  key: K,
  initialValue?: StateValue<NhatKyChungStates, K>
) {
  const handler = useNhatKyChungHandler();
  return useChandlerState<NhatKyChungStates, K>(key, handler, initialValue);
}
