import { useMainHandlerState } from "./MainHandlerContext";
import "./ExampleComponent.state";

export function IncrementButton() {
  const [, setCount] = useMainHandlerState("count", 0);

  return (
    <button onClick={() => setCount((prev) => prev + 1)}>Increment</button>
  );
}
