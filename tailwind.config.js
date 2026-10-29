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
        // Light neutral surface background palette
        surface: {
          DEFAULT: "#ffffff",
          50: "#f8fafc",   // Slate-50: Main app background
          100: "#f1f5f9",  // Slate-100: Secondary card / subtle fill
          200: "#e2e8f0",  // Slate-200: Borders & dividers
          300: "#cbd5e1",  // Slate-300: Stronger borders
          400: "#94a3b8",  // Slate-400: Muted text
          500: "#64748b",  // Slate-500: Subtitles / secondary labels
          600: "#475569",  // Slate-600: Body text
          700: "#334155",  // Slate-700: Headings
          800: "#1e293b",  // Slate-800: High-contrast text
          900: "#0f172a",  // Slate-900: Pure contrast
        },
        // Deep Indigo primary brand accent
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",  // Main CTA button
          700: "#4338ca",  // Deep Indigo: Primary brand accent
          800: "#3730a3",  // Dark Indigo
          900: "#312e81",
          950: "#1e1b4b",
        },
        // Restrained Teal accent (learning indicators, active sessions)
        teal: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",  // Restrained Teal accent
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
        // Restrained Violet accent (summaries, concepts)
        violet: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",  // Restrained Violet accent
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        // Status Colors
        success: {
          50: "#f0fdf4",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
        },
        warning: {
          50: "#fffbeb",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
        },
        danger: {
          50: "#fef2f2",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)",
        hover: "0 10px 25px -5px rgba(67, 56, 202, 0.08), 0 8px 10px -6px rgba(67, 56, 202, 0.04)",
        dropdown: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
        modal: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
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
