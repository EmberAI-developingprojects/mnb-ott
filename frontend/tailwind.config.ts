import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // CSS variable-тай уялдуулсан semantic tokens
        bg:      "var(--bg)",
        surface: "var(--surface)",
        card:    "var(--card)",
        input:   "var(--input)",
        "c-text":   "var(--text)",
        "c-muted":  "var(--muted)",
        "c-border": "var(--border)",
        primary: "#0046A5",
        danger:  "#CF1E28",

        // Legacy (аль хэдийн ашиглаж байгаа)
        "dark-bg": "var(--bg)",
        "text-main": "var(--text)",
        muted:   "var(--muted)",
      },
      screens: { xs: "475px" },
    },
  },
  plugins: [],
};

export default config;
