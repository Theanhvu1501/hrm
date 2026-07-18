import { createContext, useContext, useState, ReactNode } from "react";
import { KqkdHandler, KqkdStates } from "./kqkdHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const KqkdHandlerContext = createContext<KqkdHandler | null>(null);

export function KqkdHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new KqkdHandler());

  return (
    <KqkdHandlerContext.Provider value={handler}>
      {children}
    </KqkdHandlerContext.Provider>
  );
}

export function useKqkdHandler() {
  const handler = useContext(KqkdHandlerContext);
  if (!handler) {
    throw new Error("useKqkdHandler must be used within KqkdHandlerProvider");
  }
  return handler;
}

export function useKqkdState<K extends StateKey<KqkdStates>>(
  key: K,
  initialValue?: StateValue<KqkdStates, K>
) {
  const handler = useKqkdHandler();
  return useChandlerState<KqkdStates, K>(key, handler, initialValue);
}
