import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import basicSsl from "@vitejs/plugin-basic-ssl";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  resolve: {
    alias: {
      // 设置 @ 指向 src 目录
      "@": resolve(__dirname, "./src"),
      // 设置 # 指向 src/assets（可选）
      "#": resolve(__dirname, "./src/assets"),
    },
  },
  server: {
    https: {
      key: "./mkcert/cert.key",
      cert: "./mkcert/cert.crt",
    },
    host: "0.0.0.0", // 允许通过IP访问
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
