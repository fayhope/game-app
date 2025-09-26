/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Press Start 2P"', 'cursive'],
        mono: ['"Space Mono"', 'monospace'],
        outfit: ['Outfit', 'sans-serif'],
      },
      animation: {
        'fade-in-scale': 'fadeInScale 0.5s ease-out forwards',
        'pulse-green': 'pulseGreen 1.5s infinite',
      },
      keyframes: {
        fadeInScale: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGreen: {
          '0%, 100%': { 'box-shadow': '0 0 0 0 rgba(34, 197, 94, 0.7)' },
          '50%': { 'box-shadow': '0 0 0 10px rgba(34, 197, 94, 0)' },
        },
      },
    },
  },
  plugins: [],
} 