const { hairlineWidth } = require("nativewind/theme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./app/**/*.{js,jsx}",
    "./components/**/*.{ts,tsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",

    "./stories/**/*.{js,jsx,ts,tsx}", // Add this line
    "./.storybook/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Moaddi design tokens (mirror of ~/theme/moaddi). Namespaced to
        // avoid clobbering Tailwind defaults or the shadcn hsl() vars above.
        moaddi: {
          teal: {
            50: "#e9f8fa",
            100: "#cdeff4",
            200: "#9fe1ea",
            300: "#63cddd",
            400: "#2cb4cc",
            500: "#1e9db4",
            600: "#17808f",
            700: "#136675",
            800: "#114f5c",
            900: "#0d3a44",
          },
          periwinkle: {
            100: "#e4e9fb",
            300: "#a5b3ef",
            400: "#7287e2",
            600: "#4c5fc0",
          },
          gold: {
            100: "#f9f0d8",
            300: "#ecd28f",
            400: "#e0bd5f",
            600: "#b6923a",
          },
          ink: {
            50: "#fafafa",
            100: "#f4f4f5",
            200: "#e4e4e7",
            300: "#d4d4d8",
            400: "#a1a1aa",
            500: "#71717a",
            700: "#3f3f46",
            900: "#18181b",
            950: "#09090b",
          },
          success: "#16a34a",
          warning: "#d97706",
          danger: "#99001a",
          info: "#0077cc",
        },
      },
      borderRadius: {
        "moaddi-sm": "8px",
        "moaddi-md": "12px",
        "moaddi-lg": "16px",
        "moaddi-xl": "24px",
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
