import { createContext, useContext, useState, ReactNode } from "react";
import { NhatKyChungFormHandler, NhatKyChungFormStates } from "./form-handler/nhat-ky-chung-form.handler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const NhatKyChungFormHandlerContext = createContext<NhatKyChungFormHandler | null>(null);

export function NhatKyChungFormHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new NhatKyChungFormHandler());

  return (
    <NhatKyChungFormHandlerContext.Provider value={handler}>
      {children}
    </NhatKyChungFormHandlerContext.Provider>
  );
}

export function useNhatKyChungFormHandler() {
  const handler = useContext(NhatKyChungFormHandlerContext);
  if (!handler) {
    throw new Error("useNhatKyChungFormHandler must be used within NhatKyChungFormHandlerProvider");
  }
  return handler;
}

export function useNhatKyChungFormState<K extends StateKey<NhatKyChungFormStates>>(
  key: K,
  initialValue?: StateValue<NhatKyChungFormStates, K>
) {
  const handler = useNhatKyChungFormHandler();
  return useChandlerState<NhatKyChungFormStates, K>(key, handler, initialValue);
}
