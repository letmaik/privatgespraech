import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  // Use relative paths in production builds so the app can be hosted from any subfolder.
  base: './',
  plugins: [react()],
});
