import { createContext, useContext, useState, ReactNode } from "react";
import { HopDongLaoDongHandler, HopDongLaoDongStates } from "./hopDongLaoDongHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const HopDongLaoDongHandlerContext = createContext<HopDongLaoDongHandler | null>(null);

export function HopDongLaoDongHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new HopDongLaoDongHandler());
  return (
    <HopDongLaoDongHandlerContext.Provider value={handler}>
      {children}
    </HopDongLaoDongHandlerContext.Provider>
  );
}

export function useHopDongLaoDongHandler() {
  const handler = useContext(HopDongLaoDongHandlerContext);
  if (!handler) {
    throw new Error(
      "useHopDongLaoDongHandler must be used within HopDongLaoDongHandlerProvider"
    );
  }
  return handler;
}

export function useHopDongLaoDongState<K extends StateKey<HopDongLaoDongStates>>(
  key: K,
  initialValue?: StateValue<HopDongLaoDongStates, K>
) {
  const handler = useHopDongLaoDongHandler();
  return useChandlerState<HopDongLaoDongStates, K>(key, handler, initialValue);
}
