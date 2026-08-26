import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#F7F9FB",
          raised: "#FFFFFF",
          overlay: "#EEF2F6",
        },
        line: {
          DEFAULT: "#E3E9EF",
          strong: "#C9D4DE",
        },
        ink: {
          DEFAULT: "#101B2D",
          muted: "#4E6178",
          faint: "#8CA0B3",
        },
        azure: "#2563EB",
        azureDeep: "#1D4ED8",
        fight: "#059669",
        settle: "#D97706",
        escalate: "#DC2626",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,27,45,0.04), 0 4px 16px rgba(16,27,45,0.05)",
        pop: "0 12px 32px rgba(16,27,45,0.10)",
      },
      keyframes: {
        "soft-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-glow": "soft-pulse 1.4s ease-in-out infinite",
        "fade-up": "fade-up 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
