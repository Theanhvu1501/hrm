import { createContext, useContext, useState, ReactNode } from "react";
import { CauHinhLuongHandler, CauHinhLuongStates } from "./cauHinhLuongHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const CauHinhLuongHandlerContext = createContext<CauHinhLuongHandler | null>(null);

export function CauHinhLuongHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new CauHinhLuongHandler());
  return (
    <CauHinhLuongHandlerContext.Provider value={handler}>
      {children}
    </CauHinhLuongHandlerContext.Provider>
  );
}

export function useCauHinhLuongHandler() {
  const handler = useContext(CauHinhLuongHandlerContext);
  if (!handler) {
    throw new Error(
      "useCauHinhLuongHandler must be used within CauHinhLuongHandlerProvider"
    );
  }
  return handler;
}

export function useCauHinhLuongState<K extends StateKey<CauHinhLuongStates>>(
  key: K,
  initialValue?: StateValue<CauHinhLuongStates, K>
) {
  const handler = useCauHinhLuongHandler();
  return useChandlerState<CauHinhLuongStates, K>(key, handler, initialValue);
}
