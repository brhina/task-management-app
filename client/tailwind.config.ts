import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#339AF0',
          hover: '#228BE6',
          light: '#E7F5FF',
        },
        sidebar: '#F8F9FA',
        app: {
          bg: '#F8F9FA',
          panel: '#FFFFFF',
          panel2: '#FFFFFF',
          border: 'rgba(0, 0, 0, 0.08)',
        },
        semantic: {
          success: '#51CF66',
          warning: '#FFD43B',
          danger: '#FF6B6B',
          info: '#339AF0',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        cardHover: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
      },
      borderRadius: {
        xl: '0.95rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
} satisfies Config
