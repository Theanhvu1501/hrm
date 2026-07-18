import { AppEvent } from "../../app-event";
import { BaseEvents } from "../../types";
import {
  applyMixins,
  CExecuteAction,
  CNotifyAction,
  CRegisterAction,
  CStorageAction,
  CStateAction,
  BaseStorage,
  BaseStates,
} from "../actions";
import { HANDLER_SUBSCRIBER_KEY } from "./handler.decorator";

export class CSubHanlder<
  TEvents extends BaseEvents = BaseEvents,
  TStates extends BaseStates = BaseStates,
  TStorage extends BaseStorage = BaseStorage
> {
  constructor(
    public appEvent: AppEvent,
    public storage: Map<string, unknown>,
    public states: Map<string, unknown>
  ) {
    this.assignHandlers();
  }

  private assignHandlers(): void {
    const methods = Object.getOwnPropertyNames(
      Object.getPrototypeOf(this)
    ).filter(
      (m) => m !== "constructor" && typeof this[m] === "function"
    ) as (keyof CSubHanlder)[];

    methods.forEach((methodName) => {
      const meta = Reflect.getMetadata(
        HANDLER_SUBSCRIBER_KEY,
        this[methodName]
      );

      if (!meta) return;

      const { action } = meta;

      this.appEvent.register(action).subscribe((data) => {
        (this[methodName] as unknown as Function)(data);
      });
    });
  }
}

export interface CSubHanlder<
  TEvents extends BaseEvents = BaseEvents,
  TStates extends BaseStates = BaseStates,
  TStorage extends BaseStorage = BaseStorage
> extends CNotifyAction<TEvents>,
    CExecuteAction<TEvents>,
    CRegisterAction<TEvents>,
    CStorageAction<TStorage>,
    CStateAction<TStates> {}

applyMixins(CSubHanlder, [
  CNotifyAction,
  CExecuteAction,
  CRegisterAction,
  CStorageAction,
  CStateAction,
]);
