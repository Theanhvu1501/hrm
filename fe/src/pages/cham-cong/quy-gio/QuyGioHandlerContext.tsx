import { createContext, useContext, useState, ReactNode } from "react";
import { QuyGioHandler, QuyGioStates } from "./quyGioHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const QuyGioHandlerContext = createContext<QuyGioHandler | null>(null);

export function QuyGioHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new QuyGioHandler());
  return (
    <QuyGioHandlerContext.Provider value={handler}>
      {children}
    </QuyGioHandlerContext.Provider>
  );
}

export function useQuyGioHandler() {
  const handler = useContext(QuyGioHandlerContext);
  if (!handler) {
    throw new Error("useQuyGioHandler must be used within QuyGioHandlerProvider");
  }
  return handler;
}

export function useQuyGioState<K extends StateKey<QuyGioStates>>(
  key: K,
  initialValue?: StateValue<QuyGioStates, K>
) {
  const handler = useQuyGioHandler();
  return useChandlerState<QuyGioStates, K>(key, handler, initialValue);
}
