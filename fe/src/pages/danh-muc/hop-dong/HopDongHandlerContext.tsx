import { createContext, useContext, useState, ReactNode } from "react";
import { HopDongHandler, HopDongStates } from "./handler/hop-dong.handler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const HopDongHandlerContext = createContext<HopDongHandler | null>(null);

export function HopDongHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new HopDongHandler());
  return (
    <HopDongHandlerContext.Provider value={handler}>
      {children}
    </HopDongHandlerContext.Provider>
  );
}

export function useHopDongHandler() {
  const handler = useContext(HopDongHandlerContext);
  if (!handler) throw new Error("useHopDongHandler must be used within HopDongHandlerProvider");
  return handler;
}

export function useHopDongState<K extends StateKey<HopDongStates>>(
  key: K,
  initialValue?: StateValue<HopDongStates, K>
) {
  const handler = useHopDongHandler();
  return useChandlerState<HopDongStates, K>(key, handler, initialValue);
}
