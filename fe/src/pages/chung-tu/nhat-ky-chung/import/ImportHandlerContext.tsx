import { createContext, useContext, useState, ReactNode } from "react";
import { ImportHandler } from "./import.handler";
import { ImportStates } from "./import.state";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const ImportHandlerContext = createContext<ImportHandler | null>(null);

export function ImportHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new ImportHandler());

  return (
    <ImportHandlerContext.Provider value={handler}>
      {children}
    </ImportHandlerContext.Provider>
  );
}

export function useImportHandler(): ImportHandler {
  const handler = useContext(ImportHandlerContext);
  if (!handler) {
    throw new Error("useImportHandler must be used within ImportHandlerProvider");
  }
  return handler;
}

export function useImportState<K extends StateKey<ImportStates>>(
  key: K,
  initialValue?: StateValue<ImportStates, K>
) {
  const handler = useImportHandler();
  return useChandlerState<ImportStates, K>(key, handler, initialValue);
}
