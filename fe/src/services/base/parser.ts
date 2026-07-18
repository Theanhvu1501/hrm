export interface Parser<T> {
  parse: (response: unknown) => Promise<T>;
}
