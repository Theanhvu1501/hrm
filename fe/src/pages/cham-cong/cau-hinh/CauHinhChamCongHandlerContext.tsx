import { createContext, useContext, useState, ReactNode } from "react";
import { CauHinhChamCongHandler, CauHinhChamCongStates } from "./cauHinhChamCongHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const CauHinhChamCongHandlerContext = createContext<CauHinhChamCongHandler | null>(null);

export function CauHinhChamCongHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new CauHinhChamCongHandler());
  return (
    <CauHinhChamCongHandlerContext.Provider value={handler}>
      {children}
    </CauHinhChamCongHandlerContext.Provider>
  );
}

export function useCauHinhChamCongHandler() {
  const handler = useContext(CauHinhChamCongHandlerContext);
  if (!handler) {
    throw new Error(
      "useCauHinhChamCongHandler must be used within CauHinhChamCongHandlerProvider"
    );
  }
  return handler;
}

export function useCauHinhChamCongState<K extends StateKey<CauHinhChamCongStates>>(
  key: K,
  initialValue?: StateValue<CauHinhChamCongStates, K>
) {
  const handler = useCauHinhChamCongHandler();
  return useChandlerState<CauHinhChamCongStates, K>(key, handler, initialValue);
}
