import { createContext, useContext, useState, ReactNode } from "react";
import {
  DiaDiemChamCongHandler,
  DiaDiemChamCongStates,
} from "./diaDiemChamCongHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const DiaDiemChamCongHandlerContext = createContext<DiaDiemChamCongHandler | null>(
  null
);

export function DiaDiemChamCongHandlerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [handler] = useState(() => new DiaDiemChamCongHandler());
  return (
    <DiaDiemChamCongHandlerContext.Provider value={handler}>
      {children}
    </DiaDiemChamCongHandlerContext.Provider>
  );
}

export function useDiaDiemChamCongHandler() {
  const handler = useContext(DiaDiemChamCongHandlerContext);
  if (!handler) {
    throw new Error(
      "useDiaDiemChamCongHandler must be used within DiaDiemChamCongHandlerProvider"
    );
  }
  return handler;
}

export function useDiaDiemChamCongState<K extends StateKey<DiaDiemChamCongStates>>(
  key: K,
  initialValue?: StateValue<DiaDiemChamCongStates, K>
) {
  const handler = useDiaDiemChamCongHandler();
  return useChandlerState<DiaDiemChamCongStates, K>(key, handler, initialValue);
}
