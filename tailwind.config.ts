import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        fruma: {
          bg: "#0B0B0C", // Pure Obsidian Base Canvas
          surface: "#121214", // Elevated Technical Dashboard Container
          border: "#1F1F23", // Crisp, Razor-Thin Rule Line
          muted: "#6E7E91", // Cold Surgical Slate Metadata Text
          text: "#F5F5F7", // High-Legibility Optic White
          accent: "#3B82F6", // Data Flow Focus Indigo
          amber: "#F59E0B", // Explicit Refusal Warning Alert
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
