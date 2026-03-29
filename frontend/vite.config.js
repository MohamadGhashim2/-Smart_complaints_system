import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function normalizeBackendOrigin(rawOrigin) {
  const parsed = new URL(rawOrigin || "http://127.0.0.1:8000");
  const isLocalHost = ["localhost", "127.0.0.1", "0.0.0.0"].includes(
    parsed.hostname
  );

  // Django runserver المحلي لا يدعم HTTPS افتراضياً
  if (isLocalHost && parsed.protocol === "https:") {
    parsed.protocol = "http:";
  }

  return parsed.toString().replace(/\/$/, "");
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendOrigin = normalizeBackendOrigin(env.VITE_BACKEND_ORIGIN);

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        "/api": {
          target: backendOrigin,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});