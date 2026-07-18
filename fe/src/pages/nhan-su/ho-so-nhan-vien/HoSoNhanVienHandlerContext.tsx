import { createContext, useContext, useState, ReactNode } from "react";
import { HoSoNhanVienHandler, HoSoNhanVienStates } from "./hoSoNhanVienHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const HoSoNhanVienHandlerContext = createContext<HoSoNhanVienHandler | null>(null);

export function HoSoNhanVienHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new HoSoNhanVienHandler());
  return (
    <HoSoNhanVienHandlerContext.Provider value={handler}>
      {children}
    </HoSoNhanVienHandlerContext.Provider>
  );
}

export function useHoSoNhanVienHandler() {
  const handler = useContext(HoSoNhanVienHandlerContext);
  if (!handler) {
    throw new Error(
      "useHoSoNhanVienHandler must be used within HoSoNhanVienHandlerProvider"
    );
  }
  return handler;
}

export function useHoSoNhanVienState<K extends StateKey<HoSoNhanVienStates>>(
  key: K,
  initialValue?: StateValue<HoSoNhanVienStates, K>
) {
  const handler = useHoSoNhanVienHandler();
  return useChandlerState<HoSoNhanVienStates, K>(key, handler, initialValue);
}
