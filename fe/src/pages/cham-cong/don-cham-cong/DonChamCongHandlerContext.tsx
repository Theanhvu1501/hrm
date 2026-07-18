import { createContext, useContext, useState, ReactNode } from "react";
import { DonChamCongHandler, DonChamCongStates } from "./donChamCongHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const DonChamCongHandlerContext = createContext<DonChamCongHandler | null>(null);

export function DonChamCongHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new DonChamCongHandler());
  return (
    <DonChamCongHandlerContext.Provider value={handler}>
      {children}
    </DonChamCongHandlerContext.Provider>
  );
}

export function useDonChamCongHandler() {
  const handler = useContext(DonChamCongHandlerContext);
  if (!handler) {
    throw new Error(
      "useDonChamCongHandler must be used within DonChamCongHandlerProvider"
    );
  }
  return handler;
}

export function useDonChamCongState<K extends StateKey<DonChamCongStates>>(
  key: K,
  initialValue?: StateValue<DonChamCongStates, K>
) {
  const handler = useDonChamCongHandler();
  return useChandlerState<DonChamCongStates, K>(key, handler, initialValue);
}
