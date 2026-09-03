import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Light-First Design System
        canvas: "#FBFBFA", // warm off-white page canvas
        surface: {
          DEFAULT: "#FFFFFF", // pure white surface
          subtle: "#F6F6F4", // subtle secondary surface
          muted: "#EFEFED", // muted container surface
          hover: "#F3F3F1", // interaction hover
        },
        line: {
          DEFAULT: "#E5E5E3", // hairline border
          strong: "#D4D4D0", // stronger dividing line
          subtle: "#EFEFEF", // ultra-light line
        },
        ink: {
          DEFAULT: "#111110", // near-black primary typography
          secondary: "#5A5A57", // graphite secondary typography
          muted: "#767672", // muted body typography
          faint: "#A3A39E", // faint metadata typography
          inverted: "#FFFFFF",
        },
        // Restrained Decision & Accent Tokens
        accent: {
          DEFAULT: "#0F52BA", // restrained cobalt/blue accent
          hover: "#0D459D",
          subtle: "#EFF6FF",
          line: "#BFDBFE",
        },
        // Restrained Decision Colors
        decision: {
          allow: "#15803D", // restrained emerald
          allowBg: "#F0FDF4",
          allowLine: "#BBF7D0",
          challenge: "#B45309", // restrained amber
          challengeBg: "#FFFBEB",
          challengeLine: "#FDE68A",
          block: "#B91C1C", // restrained red
          blockBg: "#FEF2F2",
          blockLine: "#FECACA",
          hold: "#334155", // restrained dark slate
          holdBg: "#F8FAFC",
          holdLine: "#E2E8F0",
        },
        // Semantic Utilities
        emerald: {
          DEFAULT: "#15803D",
          light: "#22C55E",
          dark: "#166534",
          bg: "#F0FDF4",
          border: "#BBF7D0",
        },
        amber: {
          DEFAULT: "#B45309",
          light: "#F59E0B",
          dark: "#92400E",
          bg: "#FFFBEB",
          border: "#FDE68A",
        },
        red: {
          DEFAULT: "#B91C1C",
          light: "#EF4444",
          dark: "#991B1B",
          bg: "#FEF2F2",
          border: "#FECACA",
        },
        azure: {
          DEFAULT: "#0F52BA",
          light: "#2563EB",
          dark: "#1E40AF",
          bg: "#EFF6FF",
          border: "#BFDBFE",
        },
      },
      fontFamily: {
        display: [
          "Clash Display",
          "Syne",
          "Satoshi",
          "Inter",
          "sans-serif",
        ],
        satoshi: [
          "Satoshi",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        editorial: [
          "Instrument Serif",
          "Newsreader",
          "Playfair Display",
          "Georgia",
          "serif",
        ],
        serif: [
          "Instrument Serif",
          "Newsreader",
          "Georgia",
          "serif",
        ],
        sans: [
          "Inter",
          "Satoshi",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "IBM Plex Mono",
          "Geist Mono",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(0, 0, 0, 0.04)",
        card: "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
        pop: "0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03)",
        modal: "0 20px 40px -10px rgba(0, 0, 0, 0.12)",
      },
      letterSpacing: {
        tighter: "-0.04em",
        tight: "-0.02em",
        normal: "0",
        wide: "0.02em",
        wider: "0.04em",
        widest: "0.08em",
      },
    },
  },
  plugins: [],
};

export default config;
