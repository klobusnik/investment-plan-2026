import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	// Served from a GitHub Pages project site at https://<user>.github.io/investment-plan-2026/,
	// so assets must be prefixed with the repo name.
	base: "/investment-plan-2026/",
});
