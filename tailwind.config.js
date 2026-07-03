/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        void: {
          950: "#050710",
          900: "#080B12",
          800: "#0D1420",
          700: "#131C2B",
          600: "#1B2637",
          500: "#25334A",
        },
        signal: {
          400: "#5EEAD4",
          500: "#22D3EE",
          600: "#0EA5C4",
          glow: "#39FFC8",
        },
        relic: {
          400: "#F7C873",
          500: "#F0A93B",
          600: "#C97F1E",
        },
        danger: {
          500: "#FB6169",
        },
      },
      fontFamily: {
        display: ["'Chakra Petch'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        "glow-signal": "0 0 20px rgba(34, 211, 238, 0.35)",
        "glow-relic": "0 0 24px rgba(240, 169, 59, 0.45)",
        "hud": "inset 0 0 0 1px rgba(94, 234, 212, 0.15)",
      },
      backgroundImage: {
        scanlines:
          "repeating-linear-gradient(0deg, rgba(94,234,212,0.035) 0px, rgba(94,234,212,0.035) 1px, transparent 1px, transparent 3px)",
        "radial-fade":
          "radial-gradient(circle at center, rgba(34,211,238,0.14) 0%, rgba(5,7,16,0) 70%)",
      },
      keyframes: {
        "radar-sweep": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.6)", opacity: "0.8" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        "fog-dissolve": {
          "0%": { opacity: "1", filter: "blur(0px)" },
          "100%": { opacity: "0", filter: "blur(6px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "float-y": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "radar-sweep": "radar-sweep 4s linear infinite",
        "pulse-ring": "pulse-ring 2.2s cubic-bezier(0,0.6,0.4,1) infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "float-y": "float-y 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
