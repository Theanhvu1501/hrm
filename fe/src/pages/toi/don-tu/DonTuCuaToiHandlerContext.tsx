import { createContext, useContext, useState, ReactNode } from "react";
import { DonTuCuaToiHandler, DonTuCuaToiStates } from "./donTuCuaToiHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import {
  StateKey,
  StateValue,
} from "@/common/c-handler/core/actions/c-state.action";

const DonTuCuaToiContext = createContext<DonTuCuaToiHandler | null>(null);

export function DonTuCuaToiHandlerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [handler] = useState(() => new DonTuCuaToiHandler());
  return (
    <DonTuCuaToiContext.Provider value={handler}>
      {children}
    </DonTuCuaToiContext.Provider>
  );
}

export function useDonTuCuaToiHandler() {
  const handler = useContext(DonTuCuaToiContext);
  if (!handler) {
    throw new Error(
      "useDonTuCuaToiHandler must be used within DonTuCuaToiHandlerProvider"
    );
  }
  return handler;
}

export function useDonTuCuaToiState<K extends StateKey<DonTuCuaToiStates>>(
  key: K,
  initialValue?: StateValue<DonTuCuaToiStates, K>
) {
  const handler = useDonTuCuaToiHandler();
  return useChandlerState<DonTuCuaToiStates, K>(key, handler, initialValue);
}
