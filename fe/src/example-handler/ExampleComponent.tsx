import { useMainHandlerState, MainHandlerProvider } from "./MainHandlerContext";
import { IncrementButton } from "./IncrementButton";
import { DecrementButton } from "./DecrementButton";
import { CountDisplay } from "./CountDisplay";

function ExampleComponentInner() {
  const [, setCount] = useMainHandlerState("count", 0);

  return (
    <div style={{ padding: 20, border: "1px solid #ccc", margin: 20 }}>
      <h3>Example Handler State</h3>
      <CountDisplay />
      <IncrementButton />
      <DecrementButton />
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}

export function ExampleComponent() {
  return (
    <MainHandlerProvider>
      <ExampleComponentInner />
    </MainHandlerProvider>
  );
}
