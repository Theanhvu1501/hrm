import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./common";
import { applyManifestForPath } from "./pwa/employeeManifest";

applyManifestForPath(window.location.pathname);

createRoot(document.getElementById("root")!).render(<App />);
