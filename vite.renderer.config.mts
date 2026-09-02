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
          "connect-src 'self' ws://localhost:*",
        );
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [react(), ...(command === "serve" ? [developmentCsp()] : [])],
}));
