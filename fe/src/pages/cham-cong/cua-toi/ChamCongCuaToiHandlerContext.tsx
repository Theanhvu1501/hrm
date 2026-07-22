import { createContext, useContext, useState, ReactNode } from "react";
import {
  ChamCongCuaToiHandler,
  ChamCongCuaToiStates,
} from "./chamCongCuaToiHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import {
  StateKey,
  StateValue,
} from "@/common/c-handler/core/actions/c-state.action";

const ChamCongCuaToiContext = createContext<ChamCongCuaToiHandler | null>(null);

export function ChamCongCuaToiHandlerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [handler] = useState(() => new ChamCongCuaToiHandler());
  return (
    <ChamCongCuaToiContext.Provider value={handler}>
      {children}
    </ChamCongCuaToiContext.Provider>
  );
}

export function useChamCongCuaToiHandler() {
  const handler = useContext(ChamCongCuaToiContext);
  if (!handler) {
    throw new Error(
      "useChamCongCuaToiHandler must be used within ChamCongCuaToiHandlerProvider"
    );
  }
  return handler;
}

export function useChamCongCuaToiState<
  K extends StateKey<ChamCongCuaToiStates>
>(key: K, initialValue?: StateValue<ChamCongCuaToiStates, K>) {
  const handler = useChamCongCuaToiHandler();
  return useChandlerState<ChamCongCuaToiStates, K>(key, handler, initialValue);
}
