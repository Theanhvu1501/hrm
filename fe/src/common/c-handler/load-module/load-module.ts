export function loadModule(modules: Record<string, any>): void {
  const handlerCount = Object.keys(modules).length;
  console.log(`📦 Auto-loaded ${handlerCount} handler(s)`);
}
