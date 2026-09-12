import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

function developmentCsp(): Plugin {
  return {
    name: "aaaat-development-csp",
    transformIndexHtml(html) {
      return html
        .replace(
          "style-src 'self'",
          "style-src 'self' 'unsafe-inline'",
        )
        .replace(
          "connect-src 'self'",
          "connect-src 'self' ws://127.0.0.1:* ws://localhost:*",
        );
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [react(), ...(command === "serve" ? [developmentCsp()] : [])],
  server: command === "serve" ? { host: "127.0.0.1" } : undefined,
}));
