import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
    watch: {
      usePolling: true,
      ignored: ["**/node_modules/**", "C:/Windows/**", "C:\\Windows\\**"],
    },
  },
});
