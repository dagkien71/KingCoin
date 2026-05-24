import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        kc: {
          bg: "#06080a",
          elevated: "#0c1014",
          surface: "#12181f",
          border: "rgba(255,255,255,0.06)",
          "border-strong": "rgba(255,255,255,0.1)",
          muted: "#8b939e",
          fg: "#e8eaed",
          accent: "#d4a012",
          "accent-hover": "#e8b820",
          "accent-muted": "rgba(212,160,18,0.15)",
          up: "#22c55e",
          down: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        kc: "0 0 0 1px rgba(255,255,255,0.06), 0 24px 48px rgba(0,0,0,0.45)",
        "kc-glow": "0 0 32px rgba(212,160,18,0.12)",
      },
      animation: {
        "fade-in": "fadeIn 0.35s ease-out forwards",
        marquee: "marquee 40s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
