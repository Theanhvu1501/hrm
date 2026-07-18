import { createContext, useContext, useState, ReactNode } from "react";
import { ThoiViecHandler, ThoiViecStates } from "./thoiViecHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const ThoiViecHandlerContext = createContext<ThoiViecHandler | null>(null);

export function ThoiViecHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new ThoiViecHandler());
  return (
    <ThoiViecHandlerContext.Provider value={handler}>
      {children}
    </ThoiViecHandlerContext.Provider>
  );
}

export function useThoiViecHandler() {
  const handler = useContext(ThoiViecHandlerContext);
  if (!handler) {
    throw new Error("useThoiViecHandler must be used within ThoiViecHandlerProvider");
  }
  return handler;
}

export function useThoiViecState<K extends StateKey<ThoiViecStates>>(
  key: K,
  initialValue?: StateValue<ThoiViecStates, K>
) {
  const handler = useThoiViecHandler();
  return useChandlerState<ThoiViecStates, K>(key, handler, initialValue);
}
