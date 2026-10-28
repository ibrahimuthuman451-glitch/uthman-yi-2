import type { Config } from "tailwindcss";

/**
 * Uthman IY design system.
 *
 * The official logo is blue; the palette below complements it without altering
 * the logo file itself. Every component uses these tokens so new products and
 * pages inherit the same visual identity.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe6ff",
          200: "#bed2ff",
          300: "#91b3ff",
          400: "#5d8bfb",
          500: "#3866f0",
          600: "#2148dd",
          700: "#1b39b6",
          800: "#1b3392",
          900: "#1b2f74",
          950: "#131f46",
        },
        navy: {
          50: "#f4f7fb",
          100: "#e6edf6",
          200: "#c9d9ea",
          300: "#9bbad6",
          400: "#6694bd",
          500: "#4576a2",
          600: "#345d85",
          700: "#2b4b6b",
          800: "#27405a",
          900: "#0b1b33",
          950: "#061024",
        },
        accent: {
          400: "#39c7f2",
          500: "#12b0e2",
          600: "#0b8cb8",
        },
        ink: "#0b1524",
        muted: "#54637a",
        canvas: "#ffffff",
        surface: "#f6f8fc",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11, 21, 36, 0.04), 0 12px 32px -18px rgba(11, 21, 36, 0.28)",
        lift: "0 18px 50px -24px rgba(11, 21, 36, 0.45)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      maxWidth: {
        content: "76rem",
      },
      backgroundImage: {
        "grid-soft":
          "linear-gradient(to right, rgba(33,72,221,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(33,72,221,0.07) 1px, transparent 1px)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
