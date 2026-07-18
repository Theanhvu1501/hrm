import { createContext, useContext, useState, ReactNode } from "react";
import { MainHandler, MainStates } from "./handler/main.handler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const MainHandlerContext = createContext<MainHandler | null>(null);

export function MainHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new MainHandler());

  return (
    <MainHandlerContext.Provider value={handler}>
      {children}
    </MainHandlerContext.Provider>
  );
}

export function useMainHandler() {
  const handler = useContext(MainHandlerContext);
  if (!handler) {
    throw new Error("useMainHandler must be used within MainHandlerProvider");
  }
  return handler;
}

export function useMainHandlerState<K extends StateKey<MainStates>>(
  key: K,
  initialValue?: StateValue<MainStates, K>
) {
  const handler = useMainHandler();
  return useChandlerState<MainStates, K>(key, handler, initialValue);
}
