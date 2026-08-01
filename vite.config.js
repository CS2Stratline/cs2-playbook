import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Actions sets VITE_BASE_PATH to /<repo>/ for project pages,
// or / for user/org pages named <name>.github.io.
// Local builds keep relative "./" so dist/ works from any static host.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "./",
});
