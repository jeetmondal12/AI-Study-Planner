/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0f1117',
          800: '#1a1d2e',
          700: '#242840',
        },
        cyan: {
          DEFAULT: '#00d4ff',
          glow: '#00d4ff80',
        },
        purple: {
          DEFAULT: '#7c3aed',
          glow: '#7c3aed80',
        }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}