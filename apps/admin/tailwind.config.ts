import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Classic admin palette — light content area, dark sidebar */
        bg:       "#f7f8fa",      // page background
        surface:  "#ffffff",      // cards, tables
        sidebar:  "#0f172a",      // slate-900 dark sidebar
        "sidebar-hover": "#1e293b",
        fg:       "#0f172a",      // primary text
        muted:    "#64748b",      // secondary text (slate-500)
        border:   "#e2e8f0",      // slate-200
        "border-strong": "#cbd5e1",

        /* Brand */
        primary:    "#0046A5",
        "primary-hover": "#0055c8",
        "primary-soft":  "rgba(0,70,165,0.08)",
        danger:     "#CF1E28",
        "danger-soft":   "rgba(207,30,40,0.08)",
        success:    "#16a34a",
        warning:    "#d97706",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["SF Mono", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
