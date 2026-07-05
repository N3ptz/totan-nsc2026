import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          light:   "rgb(var(--primary-light) / <alpha-value>)",
          dark:    "rgb(var(--primary-dark) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          light:   "rgb(var(--accent-light) / <alpha-value>)",
        },
        success: {
          DEFAULT: "rgb(var(--success) / <alpha-value>)",
          light:   "rgb(var(--success-light) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "rgb(var(--warning) / <alpha-value>)",
          light:   "rgb(var(--warning-light) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "rgb(var(--danger) / <alpha-value>)",
          light:   "rgb(var(--danger-light) / <alpha-value>)",
        },
        surface: "rgb(var(--surface) / <alpha-value>)",
        canvas:  "rgb(var(--canvas) / <alpha-value>)",
        bg:      "rgb(var(--bg) / <alpha-value>)",
        bg2:     "rgb(var(--bg2) / <alpha-value>)",
        ink:     "rgb(var(--ink) / <alpha-value>)",
        muted:   "rgb(var(--muted) / <alpha-value>)",
        border:  "rgb(var(--border) / <alpha-value>)",
        "aurora-1": "rgb(var(--aurora-1) / <alpha-value>)",
        "aurora-2": "rgb(var(--aurora-2) / <alpha-value>)",
        "aurora-3": "rgb(var(--aurora-3) / <alpha-value>)",
        "aurora-4": "rgb(var(--aurora-4) / <alpha-value>)",
        "aurora-5": "rgb(var(--aurora-5) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-sora)",    "system-ui", "sans-serif"],
        body:    ["var(--font-sarabun)", "system-ui", "sans-serif"],
        sans:    ["var(--font-sora)",    "system-ui", "sans-serif"],
      },
      animation: {
        "fade-up":     "fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) forwards",
        "fade-in":     "fadeIn 0.5s ease forwards",
        float:         "float 6s ease-in-out infinite",
        "float-soft":  "floatSoft 5s ease-in-out infinite",
        "pulse-slow":  "pulse 4s ease-in-out infinite",
        shimmer:       "shimmer 1.6s infinite linear",
        aurora:        "aurora-drift 28s ease-in-out infinite",
        "aurora-slow": "aurora-drift 42s ease-in-out infinite",
        blob:          "blob-morph 20s ease-in-out infinite",
        marquee:       "marquee 30s linear infinite",
        "spin-slow":   "spin-slow 14s linear infinite",
        "gradient-pan":"gradient-pan 8s ease infinite",
        twinkle:       "twinkle 3s ease-in-out infinite",
        "step-in":     "step-in 0.55s cubic-bezier(0.16,1,0.3,1) both",
        "reveal-up":   "reveal-up 0.7s cubic-bezier(0.16,1,0.3,1) both",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-12px)" },
        },
        floatSoft: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-7px)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-600px 0" },
          "100%": { backgroundPosition: "600px 0" },
        },
        "step-in": {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "reveal-up": {
          "0%":   { opacity: "0", translate: "0 32px" },
          "100%": { opacity: "1", translate: "0 0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
