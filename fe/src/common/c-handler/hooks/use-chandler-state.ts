import { useState, useCallback, useEffect } from "react";
import { CHanlder } from "../core";
import {
  BaseStates,
  StateKey,
  StateValue,
} from "../core/actions/c-state.action";

export function useChandlerState<
  TStates extends BaseStates,
  K extends StateKey<TStates>
>(
  key: K,
  handler: CHanlder,
  initialValue?: StateValue<TStates, K>
): [
  StateValue<TStates, K> | undefined,
  (
    value:
      | StateValue<TStates, K>
      | ((prev: StateValue<TStates, K> | undefined) => StateValue<TStates, K>)
  ) => void
] {
  const [state, setState] = useState<StateValue<TStates, K> | undefined>(() => {
    if (handler.hasState(key as string)) {
      return handler.getState(key as string) as StateValue<TStates, K>;
    }
    if (initialValue !== undefined) {
      handler.setState(key as string, initialValue);
      return initialValue;
    }
    return undefined;
  });

  useEffect(() => {
    const unsubscribe = handler.subscribeState(key as string, (value) => {
      setState(value as StateValue<TStates, K> | undefined);
    });
    return unsubscribe;
  }, [handler, key]);

  const setHandlerState = useCallback(
    (
      value:
        | StateValue<TStates, K>
        | ((prev: StateValue<TStates, K> | undefined) => StateValue<TStates, K>)
    ) => {
      if (typeof value === "function") {
        const currentValue = handler.getState(key as string) as
          | StateValue<TStates, K>
          | undefined;
        const newValue = (
          value as (
            prev: StateValue<TStates, K> | undefined
          ) => StateValue<TStates, K>
        )(currentValue);
        handler.setState(key as string, newValue);
      } else {
        handler.setState(key as string, value);
      }
    },
    [handler, key]
  );

  return [state, setHandlerState];
}
