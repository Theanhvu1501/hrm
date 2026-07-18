import { createContext, useContext, useState, ReactNode } from "react";
import { NhomKhuyenMaiHandler, NhomKhuyenMaiStates } from "./handler/nhom-khuyen-mai.handler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const NhomKhuyenMaiHandlerContext = createContext<NhomKhuyenMaiHandler | null>(null);

export function NhomKhuyenMaiHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new NhomKhuyenMaiHandler());
  return (
    <NhomKhuyenMaiHandlerContext.Provider value={handler}>
      {children}
    </NhomKhuyenMaiHandlerContext.Provider>
  );
}

export function useNhomKhuyenMaiHandler() {
  const handler = useContext(NhomKhuyenMaiHandlerContext);
  if (!handler) throw new Error("useNhomKhuyenMaiHandler must be used within NhomKhuyenMaiHandlerProvider");
  return handler;
}

export function useNhomKhuyenMaiState<K extends StateKey<NhomKhuyenMaiStates>>(
  key: K,
  initialValue?: StateValue<NhomKhuyenMaiStates, K>
) {
  const handler = useNhomKhuyenMaiHandler();
  return useChandlerState<NhomKhuyenMaiStates, K>(key, handler, initialValue);
}
