import { useMainHandlerState } from "./MainHandlerContext";

export function CountDisplay() {
  const [count] = useMainHandlerState("count", 0);

  return <p>Count: {count}</p>;
}
