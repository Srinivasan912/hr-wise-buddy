// Rename this file to `vite.config.ts` before deploying to Netlify.
// (Back up the original first — it powers the Lovable in-editor preview.)
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({ target: "netlify" }),
    viteReact(),
  ],
});
