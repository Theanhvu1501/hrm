import { createContext, useContext, useState, ReactNode } from "react";
import { BangLuongHandler, BangLuongStates } from "./bangLuongHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const BangLuongHandlerContext = createContext<BangLuongHandler | null>(null);

export function BangLuongHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new BangLuongHandler());
  return (
    <BangLuongHandlerContext.Provider value={handler}>
      {children}
    </BangLuongHandlerContext.Provider>
  );
}

export function useBangLuongHandler() {
  const handler = useContext(BangLuongHandlerContext);
  if (!handler) {
    throw new Error(
      "useBangLuongHandler must be used within BangLuongHandlerProvider"
    );
  }
  return handler;
}

export function useBangLuongState<K extends StateKey<BangLuongStates>>(
  key: K,
  initialValue?: StateValue<BangLuongStates, K>
) {
  const handler = useBangLuongHandler();
  return useChandlerState<BangLuongStates, K>(key, handler, initialValue);
}
