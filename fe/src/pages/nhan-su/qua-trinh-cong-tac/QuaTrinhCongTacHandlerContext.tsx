import { createContext, useContext, useState, ReactNode } from "react";
import { QuaTrinhCongTacHandler, QuaTrinhCongTacStates } from "./quaTrinhCongTacHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const QuaTrinhCongTacHandlerContext = createContext<QuaTrinhCongTacHandler | null>(null);

export function QuaTrinhCongTacHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new QuaTrinhCongTacHandler());
  return (
    <QuaTrinhCongTacHandlerContext.Provider value={handler}>
      {children}
    </QuaTrinhCongTacHandlerContext.Provider>
  );
}

export function useQuaTrinhCongTacHandler() {
  const handler = useContext(QuaTrinhCongTacHandlerContext);
  if (!handler) {
    throw new Error(
      "useQuaTrinhCongTacHandler must be used within QuaTrinhCongTacHandlerProvider"
    );
  }
  return handler;
}

export function useQuaTrinhCongTacState<K extends StateKey<QuaTrinhCongTacStates>>(
  key: K,
  initialValue?: StateValue<QuaTrinhCongTacStates, K>
) {
  const handler = useQuaTrinhCongTacHandler();
  return useChandlerState<QuaTrinhCongTacStates, K>(key, handler, initialValue);
}
