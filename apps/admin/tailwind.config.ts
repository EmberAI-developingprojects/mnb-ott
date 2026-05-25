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
        /* Токенууд CSS variable-аас уншина (globals.css :root / [data-theme]).
           rgb(var() / <alpha-value>) загвар тул opacity utility ажиллана. */
        bg:              "rgb(var(--c-bg) / <alpha-value>)",
        surface:         "rgb(var(--c-surface) / <alpha-value>)",
        sidebar:         "rgb(var(--c-sidebar) / <alpha-value>)",
        "sidebar-hover": "rgb(var(--c-sidebar-hover) / <alpha-value>)",
        fg:              "rgb(var(--c-fg) / <alpha-value>)",
        muted:           "rgb(var(--c-muted) / <alpha-value>)",
        "muted-strong":  "rgb(var(--c-muted-strong) / <alpha-value>)",
        border:          "rgb(var(--c-border) / <alpha-value>)",
        "border-strong": "rgb(var(--c-border-strong) / <alpha-value>)",

        /* Brand */
        primary:         "rgb(var(--c-primary) / <alpha-value>)",
        "primary-hover": "rgb(var(--c-primary-hover) / <alpha-value>)",
        "primary-soft":  "rgb(var(--c-primary) / 0.10)",
        danger:          "rgb(var(--c-danger) / <alpha-value>)",
        "danger-soft":   "rgb(var(--c-danger) / 0.10)",
        success:         "rgb(var(--c-success) / <alpha-value>)",
        warning:         "rgb(var(--c-warning) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-app)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["SF Mono", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        /* Картын өндөрлөг — токеноор (dark scope дотор глоу болж хувирна) */
        card:         "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
      },
    },
  },
  plugins: [],
};

export default config;
