export * from "./c-notify.action";
export * from "./c-execute.action";
export * from "./c-register.action";
export * from "./c-storage.action";
export * from "./c-state.action";

// Mixin helper function
export function applyMixins(derivedCtor: any, constructors: any[]) {
  constructors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      if (name !== "constructor") {
        Object.defineProperty(
          derivedCtor.prototype,
          name,
          Object.getOwnPropertyDescriptor(baseCtor.prototype, name) ||
            Object.create(null)
        );
      }
    });
  });
}
