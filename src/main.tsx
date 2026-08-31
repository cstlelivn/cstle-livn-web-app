
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(<App />);

  // A registered service worker lets Android Chrome install this as a real
  // standalone PWA instead of creating a browser shortcut with an address
  // bar. The worker is deliberately network-only: operational data and new
  // deployments must never be hidden behind a stale application cache.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Installation remains optional; normal browser use must still work.
      });
    });
  }
