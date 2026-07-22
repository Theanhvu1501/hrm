import { createContext, useContext, useState, ReactNode } from "react";
import { NgayLeHandler, NgayLeStates } from "./ngayLeHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const NgayLeHandlerContext = createContext<NgayLeHandler | null>(null);

export function NgayLeHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new NgayLeHandler());
  return (
    <NgayLeHandlerContext.Provider value={handler}>
      {children}
    </NgayLeHandlerContext.Provider>
  );
}

export function useNgayLeHandler() {
  const handler = useContext(NgayLeHandlerContext);
  if (!handler) {
    throw new Error("useNgayLeHandler must be used within NgayLeHandlerProvider");
  }
  return handler;
}

export function useNgayLeState<K extends StateKey<NgayLeStates>>(
  key: K,
  initialValue?: StateValue<NgayLeStates, K>
) {
  const handler = useNgayLeHandler();
  return useChandlerState<NgayLeStates, K>(key, handler, initialValue);
}
