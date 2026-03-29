import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import "./i18n";
import { ToastProvider } from "./components/ToastProvider";

createRoot(document.getElementById("root")).render(
  <ToastProvider>
    <App />
  </ToastProvider>
);