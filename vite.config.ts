import { defineConfig } from "vite"

import react from "@vitejs/plugin-react-swc"
import { monaco } from "@bithero/monaco-editor-vite-plugin"

export default defineConfig({
  plugins: [react(), monaco({ globalAPI: true, languages: "*", features: "*" })],
  base: "/angular-expressions-playground/",
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
      },
    },
  },
})
