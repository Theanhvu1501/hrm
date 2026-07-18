import { v4 } from "uuid";
import { AppEvent } from "../app-event";
import { BaseEvents } from "../types/event-type";
import {
  applyMixins,
  BaseStates,
  BaseStorage,
  CExecuteAction,
  CNotifyAction,
  CRegisterAction,
  CStateAction,
  CStorageAction,
  StateKey,
  StateValue,
  StorageKey,
  StorageValue,
} from "./actions";
import { CSubHanlder } from "./sub-handler.ts/sub-handler";
import { SubHanlderLoader } from "./sub-handler.ts/sub-handler-loader";

export interface ICHanlder<
  TStates extends BaseStates = BaseStates,
  TStorage extends BaseStorage = BaseStorage
> {
  uuid: string;
  appEvent: AppEvent;
  context: string;
  registeredHandlers: CSubHanlder[];
  storage: Map<StorageKey<TStorage>, StorageValue<TStorage>>;
  states: Map<StateKey<TStates>, StateValue<TStates>>;
}

export class CHanlder<
  TEvents extends BaseEvents = BaseEvents,
  TStates extends BaseStates = BaseStates,
  TStorage extends BaseStorage = BaseStorage
> {
  registeredHandlers: CSubHanlder[] = [];
  uuid: string = v4();
  appEvent: AppEvent = new AppEvent();
  storage = new Map();
  states = new Map();
  constructor(public context: string) {
    this.initializeRegisteredHandlers();
  }
}

export interface CHanlder<
  TEvents extends BaseEvents = BaseEvents,
  TStates extends BaseStates = BaseStates,
  TStorage extends BaseStorage = BaseStorage
> extends ICHanlder<TStates, TStorage>,
    SubHanlderLoader,
    CNotifyAction<TEvents>,
    CExecuteAction<TEvents>,
    CRegisterAction<TEvents>,
    CStorageAction<TStorage>,
    CStateAction<TStates> {}

applyMixins(CHanlder, [
  CNotifyAction,
  CExecuteAction,
  CRegisterAction,
  CStorageAction,
  CStateAction,
  SubHanlderLoader,
]);
