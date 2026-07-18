import { createContext, useContext, useState, ReactNode } from "react";
import { NhomQuanLyHandler, NhomQuanLyStates } from "./handler/nhom-quan-ly.handler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const NhomQuanLyHandlerContext = createContext<NhomQuanLyHandler | null>(null);

export function NhomQuanLyHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new NhomQuanLyHandler());
  return (
    <NhomQuanLyHandlerContext.Provider value={handler}>
      {children}
    </NhomQuanLyHandlerContext.Provider>
  );
}

export function useNhomQuanLyHandler() {
  const handler = useContext(NhomQuanLyHandlerContext);
  if (!handler) throw new Error("useNhomQuanLyHandler must be used within NhomQuanLyHandlerProvider");
  return handler;
}

export function useNhomQuanLyState<K extends StateKey<NhomQuanLyStates>>(
  key: K,
  initialValue?: StateValue<NhomQuanLyStates, K>
) {
  const handler = useNhomQuanLyHandler();
  return useChandlerState<NhomQuanLyStates, K>(key, handler, initialValue);
}
