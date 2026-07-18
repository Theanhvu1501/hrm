import { ICHanlder } from "../c-handler";

export interface BaseStates {
  [key: string]: unknown;
}

export type StateKey<T extends BaseStates = BaseStates> = keyof T;

export type StateValue<
  T extends BaseStates = BaseStates,
  K extends StateKey<T> = StateKey<T>
> = T[K];

export type StateListener<T = unknown> = (value: T | undefined) => void;

// Symbol key for storing listeners in states map
const STATE_LISTENERS_KEY = Symbol.for("__state_listeners__");

export interface CStateAction extends ICHanlder {}

export class CStateAction<TStates extends BaseStates = BaseStates> {
  states: Map<string, unknown> = new Map();

  private get stateListeners(): Map<string, Set<StateListener>> {
    // Store listeners in the states map so they are shared across instances
    if (!this.states.has(STATE_LISTENERS_KEY as unknown as string)) {
      this.states.set(STATE_LISTENERS_KEY as unknown as string, new Map());
    }
    return this.states.get(STATE_LISTENERS_KEY as unknown as string) as Map<string, Set<StateListener>>;
  }

  getState<K extends StateKey<TStates>>(
    key: K
  ): StateValue<TStates, K> | undefined {
    return this.states.get(key as string) as StateValue<TStates, K> | undefined;
  }

  setState<K extends StateKey<TStates>>(
    key: K,
    value: StateValue<TStates, K>
  ): void {
    this.states.set(key as string, value);
    this._notifyListeners(key as string, value);
  }

  hasState<K extends StateKey<TStates>>(key: K): boolean {
    return this.states.has(key as string);
  }

  subscribeState<K extends StateKey<TStates>>(
    key: K,
    listener: StateListener<StateValue<TStates, K>>
  ): () => void {
    const keyStr = key as string;
    if (!this.stateListeners.has(keyStr)) {
      this.stateListeners.set(keyStr, new Set());
    }
    this.stateListeners.get(keyStr)!.add(listener as StateListener);

    return () => {
      this.stateListeners.get(keyStr)?.delete(listener as StateListener);
    };
  }

  private _notifyListeners(key: string, value: unknown): void {
    this.stateListeners.get(key)?.forEach((listener) => listener(value));
  }
}
