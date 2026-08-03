import { createContext, useContext, useState, ReactNode } from "react";
import { BangThemGioHandler, BangThemGioStates } from "./bangLuongThemGioHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import {
  StateKey,
  StateValue,
} from "@/common/c-handler/core/actions/c-state.action";

const BangThemGioHandlerContext = createContext<BangThemGioHandler | null>(null);

export function BangThemGioHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new BangThemGioHandler());
  return (
    <BangThemGioHandlerContext.Provider value={handler}>
      {children}
    </BangThemGioHandlerContext.Provider>
  );
}

export function useBangThemGioHandler() {
  const handler = useContext(BangThemGioHandlerContext);
  if (!handler) {
    throw new Error(
      "useBangThemGioHandler must be used within BangThemGioHandlerProvider",
    );
  }
  return handler;
}

export function useBangThemGioState<K extends StateKey<BangThemGioStates>>(
  key: K,
  initialValue?: StateValue<BangThemGioStates, K>,
) {
  const handler = useBangThemGioHandler();
  return useChandlerState<BangThemGioStates, K>(key, handler, initialValue);
}
