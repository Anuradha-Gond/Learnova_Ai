/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
    "./src/app/**/*.{js,jsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Core Visual Identity Palette (Phase 1 Modernization)
        canvas: {
          DEFAULT: "#0B1120", // Main Background
          subtle: "#111827",  // Secondary Background
          card: "#172033",    // Card Background
          elevated: "#1E293B",// Elevated Surface
        },
        // Surface scale aligned with dark palette
        surface: {
          DEFAULT: "#172033",
          50: "#0B1120",   // Main app background
          100: "#111827",  // Secondary background
          200: "#172033",  // Card background
          300: "#1E293B",  // Elevated surface
          400: "#334155",  // Border
          500: "#64748B",  // Muted text
          600: "#94A3B8",  // Secondary text
          700: "#CBD5E1",  // Subtle light text
          800: "#E2E8F0",  // High contrast text
          900: "#F8FAFC",  // Main text
        },
        // Deep Indigo primary brand accent
        brand: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",  // Primary Accent
          600: "#4F46E5",  // Primary Hover / Main CTA
          700: "#4338CA",  // Deep Indigo
          800: "#3730A3",  // Dark Indigo
          900: "#312E81",
          950: "#1E1B4B",
        },
        // Learning Indicator (Teal)
        teal: {
          50: "#F0FDFA",
          100: "#CCFBF1",
          200: "#99F6E4",
          300: "#5EEAD4",
          400: "#2DD4BF",
          500: "#14B8A6",  // Learning Indicator
          600: "#0D9488",
          700: "#0F766E",
          800: "#115E59",
          900: "#134E4A",
          950: "#042F2E",
        },
        // AI Highlight (Violet)
        violet: {
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",  // AI Highlight
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
          950: "#2E1065",
        },
        // Status Colors
        success: {
          50: "#F0FDF4",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
        },
        warning: {
          50: "#FFFBEB",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
        },
        danger: {
          50: "#FEF2F2",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.2)",
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)",
        hover: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(99, 102, 241, 0.12)",
        dropdown: "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)",
        modal: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
      },
      borderRadius: {
        card: "1rem", // 16px
        btn: "0.75rem", // 12px
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": {
            transform: "translateX(100%)",
          },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slide-down 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 2s infinite",
      },
    },
  },
  plugins: [],
};
