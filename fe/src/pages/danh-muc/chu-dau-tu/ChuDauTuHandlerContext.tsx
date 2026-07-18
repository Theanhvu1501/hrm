import { createContext, useContext, useState, ReactNode } from "react";
import { ChuDauTuHandler, ChuDauTuStates } from "./handler/chu-dau-tu.handler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const ChuDauTuHandlerContext = createContext<ChuDauTuHandler | null>(null);

export function ChuDauTuHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new ChuDauTuHandler());
  return (
    <ChuDauTuHandlerContext.Provider value={handler}>
      {children}
    </ChuDauTuHandlerContext.Provider>
  );
}

export function useChuDauTuHandler() {
  const handler = useContext(ChuDauTuHandlerContext);
  if (!handler) throw new Error("useChuDauTuHandler must be used within ChuDauTuHandlerProvider");
  return handler;
}

export function useChuDauTuState<K extends StateKey<ChuDauTuStates>>(
  key: K,
  initialValue?: StateValue<ChuDauTuStates, K>
) {
  const handler = useChuDauTuHandler();
  return useChandlerState<ChuDauTuStates, K>(key, handler, initialValue);
}
