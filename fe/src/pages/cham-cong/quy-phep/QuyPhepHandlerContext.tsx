import { createContext, useContext, useState, ReactNode } from "react";
import { QuyPhepHandler, QuyPhepStates } from "./quyPhepHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const QuyPhepHandlerContext = createContext<QuyPhepHandler | null>(null);

export function QuyPhepHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new QuyPhepHandler());
  return (
    <QuyPhepHandlerContext.Provider value={handler}>
      {children}
    </QuyPhepHandlerContext.Provider>
  );
}

export function useQuyPhepHandler() {
  const handler = useContext(QuyPhepHandlerContext);
  if (!handler) {
    throw new Error("useQuyPhepHandler must be used within QuyPhepHandlerProvider");
  }
  return handler;
}

export function useQuyPhepState<K extends StateKey<QuyPhepStates>>(
  key: K,
  initialValue?: StateValue<QuyPhepStates, K>
) {
  const handler = useQuyPhepHandler();
  return useChandlerState<QuyPhepStates, K>(key, handler, initialValue);
}
