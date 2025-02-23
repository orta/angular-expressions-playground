import { defineConfig } from "vite"

import react from "@vitejs/plugin-react-swc"

import monacoEditorPluginModule from "vite-plugin-monaco-editor"

const isObjectWithDefaultFunction = (module: unknown): module is { default: typeof monacoEditorPluginModule } =>
  module != null && typeof module === "object" && "default" in module && typeof module.default === "function"

const monacoEditorPlugin = isObjectWithDefaultFunction(monacoEditorPluginModule)
  ? monacoEditorPluginModule.default
  : monacoEditorPluginModule

export default defineConfig({
  plugins: [react(), monacoEditorPlugin({ globalAPI: true })],
  base: "/angular-expressions-playground/",
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
      },
    },
  },
})
