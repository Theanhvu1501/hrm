import { createContext, useContext, useState, ReactNode } from "react";
import { QuyChaunHandler, QuyChaunStates } from "./quyChaunHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const QuyChaunHandlerContext = createContext<QuyChaunHandler | null>(null);

export function QuyChaunHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new QuyChaunHandler());

  return (
    <QuyChaunHandlerContext.Provider value={handler}>
      {children}
    </QuyChaunHandlerContext.Provider>
  );
}

export function useQuyChaunHandler() {
  const handler = useContext(QuyChaunHandlerContext);
  if (!handler) {
    throw new Error("useQuyChaunHandler must be used within QuyChaunHandlerProvider");
  }
  return handler;
}

export function useQuyChaunState<K extends StateKey<QuyChaunStates>>(
  key: K,
  initialValue?: StateValue<QuyChaunStates, K>
) {
  const handler = useQuyChaunHandler();
  return useChandlerState<QuyChaunStates, K>(key, handler, initialValue);
}
