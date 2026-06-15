/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#059669',
          hover: '#047857',
          light: '#ECFDF5',
        },
        sidebar: '#0F172A',
        surface: '#F8FAFC',
      },
      boxShadow: {
        card: '0 1px 3px rgba(15,23,42,0.08), 0 4px 12px rgba(15,23,42,0.04)',
      },
    },
  },
  plugins: [],
}
