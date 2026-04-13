import path from "node:path"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

import docsAddonPlugin from "./plugins/vite-plugin-docs-addon"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), docsAddonPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
