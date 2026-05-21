import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0046A5",
        accent: "#CF1E28",
        bg: "#08080F",
        surface: "#111118",
        card: "#1A1A24",
        fg: "#F0F0F8",
        muted: "rgba(240,240,248,0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
