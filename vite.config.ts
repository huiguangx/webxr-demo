import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 设置 @ 指向 src 目录
      "@": resolve(__dirname, "./src"),
      // 设置 # 指向 src/assets（可选）
      "#": resolve(__dirname, "./src/assets"),
    },
  },
  assetsInclude: [
    "**/*.json",
    "**/*.msdf.json",
    "**/*.png",
    "**/*.jpg",
    "**/*.glb",
    "**/*.gltf",
  ],
});
