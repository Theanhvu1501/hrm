import { ICHanlder } from "../c-handler";

export interface BaseStorage {
  [key: string]: unknown;
}

export type StorageKey<T extends BaseStorage = BaseStorage> = keyof T;

export type StorageValue<
  T extends BaseStorage = BaseStorage,
  K extends StorageKey<T> = StorageKey<T>
> = T[K];

export interface CStorageAction extends ICHanlder {}

export class CStorageAction<TStorage extends BaseStorage = BaseStorage> {
  storage: Map<string, unknown> = new Map();

  get<K extends StorageKey<TStorage>>(key: K): StorageValue<TStorage, K> | undefined {
    return this.storage.get(key as string) as StorageValue<TStorage, K> | undefined;
  }

  set<K extends StorageKey<TStorage>>(key: K, value: StorageValue<TStorage, K>): void {
    this.storage.set(key as string, value);
  }
}
