import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./common";

createRoot(document.getElementById("root")!).render(<App />);
