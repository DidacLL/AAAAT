import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

function developmentStyleCsp(): Plugin {
  return {
    name: "aaaat-development-style-csp",
    transformIndexHtml(html) {
      return html.replace(
        "style-src 'self'",
        "style-src 'self' 'unsafe-inline'",
      );
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    ...(command === "serve" ? [developmentStyleCsp()] : []),
  ],
}));
