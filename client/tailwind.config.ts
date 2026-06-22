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
          DEFAULT: '#059669',
          hover: '#047857',
          light: '#ECFDF5',
        },
        sidebar: '#0F172A',
        app: {
          bg: '#0B1220',
          panel: '#0F172A',
          panel2: '#111C2E',
          border: 'rgba(148, 163, 184, 0.14)',
        },
        semantic: {
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#F43F5E',
          info: '#38BDF8',
        },
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.04), 0 10px 30px rgba(0,0,0,0.35)',
        cardHover: '0 1px 0 rgba(255,255,255,0.06), 0 16px 42px rgba(0,0,0,0.45)',
      },
      borderRadius: {
        xl: '0.95rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
} satisfies Config
