import { useMainHandlerState } from "./MainHandlerContext";
import "./ExampleComponent.state";

export function DecrementButton() {
  const [count, setCount] = useMainHandlerState("count");

  return (
    <button onClick={() => setCount((prev) => prev - 1)}>Decrement</button>
  );
}
