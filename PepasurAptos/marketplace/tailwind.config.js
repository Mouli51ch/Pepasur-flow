/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    maxWidth: {
      '8xl': '88rem',
    },
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
        // Gaming colors
        'gaming-black': '#000000',
        'gaming-dark': '#111111',
        'gaming-green': '#4A8C4A',
        'gaming-red': '#8B0000',
        'gaming-purple': '#A259FF',
        'gaming-yellow': '#CCCC00',
        'gaming-gray': '#1a1a1a',
        'gaming-white': '#FFFFFF',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        'press-start': ['Press Start 2P', 'sans-serif'],
        'vt323': ['VT323', 'monospace'],
        'silkscreen': ['Silkscreen', 'sans-serif'],
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
        "pixel-3d-float": {
          "0%": { transform: "perspective(1000px) rotateX(15deg) translateY(0px)" },
          "50%": { transform: "perspective(1000px) rotateX(15deg) translateY(-5px)" },
          "100%": { transform: "perspective(1000px) rotateX(15deg) translateY(0px)" },
        },
        "pixel-3d-glow": {
          "0%": { 
            textShadow: "2px 2px 0px #000, 4px 4px 0px #000, 6px 6px 0px #000, 8px 8px 0px #000, 10px 10px 0px #000, 12px 12px 0px #000, 14px 14px 0px #000, 16px 16px 0px #000, 18px 18px 0px #000, 20px 20px 0px #000, 22px 22px 0px #000, 24px 24px 0px #000, 26px 26px 0px #000, 28px 28px 0px #000, 30px 30px 0px #000, 32px 32px 0px #000, 34px 34px 0px #000, 36px 36px 0px #000, 38px 38px 0px #000, 40px 40px 0px #000"
          },
          "50%": { 
            textShadow: "2px 2px 0px #000, 4px 4px 0px #000, 6px 6px 0px #000, 8px 8px 0px #000, 10px 10px 0px #000, 12px 12px 0px #000, 14px 14px 0px #000, 16px 16px 0px #000, 18px 18px 0px #000, 20px 20px 0px #000, 22px 22px 0px #000, 24px 24px 0px #000, 26px 26px 0px #000, 28px 28px 0px #000, 30px 30px 0px #000, 32px 32px 0px #000, 34px 34px 0px #000, 36px 36px 0px #000, 38px 38px 0px #000, 40px 40px 0px #000, 0 0 20px currentColor"
          },
          "100%": { 
            textShadow: "2px 2px 0px #000, 4px 4px 0px #000, 6px 6px 0px #000, 8px 8px 0px #000, 10px 10px 0px #000, 12px 12px 0px #000, 14px 14px 0px #000, 16px 16px 0px #000, 18px 18px 0px #000, 20px 20px 0px #000, 22px 22px 0px #000, 24px 24px 0px #000, 26px 26px 0px #000, 28px 28px 0px #000, 30px 30px 0px #000, 32px 32px 0px #000, 34px 34px 0px #000, 36px 36px 0px #000, 38px 38px 0px #000, 40px 40px 0px #000"
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pixel-3d-float": "pixel-3d-float 3s ease-in-out infinite",
        "pixel-3d-glow": "pixel-3d-glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
