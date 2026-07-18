import { createContext, useContext, useState, ReactNode } from "react";
import { BangCongHandler, BangCongStates } from "./bangCongHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const BangCongHandlerContext = createContext<BangCongHandler | null>(null);

export function BangCongHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new BangCongHandler());
  return (
    <BangCongHandlerContext.Provider value={handler}>
      {children}
    </BangCongHandlerContext.Provider>
  );
}

export function useBangCongHandler() {
  const handler = useContext(BangCongHandlerContext);
  if (!handler) {
    throw new Error(
      "useBangCongHandler must be used within BangCongHandlerProvider"
    );
  }
  return handler;
}

export function useBangCongState<K extends StateKey<BangCongStates>>(
  key: K,
  initialValue?: StateValue<BangCongStates, K>
) {
  const handler = useBangCongHandler();
  return useChandlerState<BangCongStates, K>(key, handler, initialValue);
}
