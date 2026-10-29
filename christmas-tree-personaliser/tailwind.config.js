/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        cream: { 50: '#fbf8f3', 100: '#f6f1ea', 200: '#ece4d8', 300: '#ddd1bf' },
        ink: { 900: '#1d2420', 700: '#3b443f', 500: '#6b726d', 300: '#a8ada9' },
        pine: { 900: '#0f3326', 700: '#1a5640', 500: '#2a7a5b', 100: '#e3efe9' },
        berry: { 600: '#a8262f' },
        brass: { 500: '#c79a3c', 100: '#f6ecd5' },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(29,36,32,0.04), 0 8px 24px -8px rgba(29,36,32,0.12)',
        lift: '0 2px 4px rgba(29,36,32,0.06), 0 18px 40px -12px rgba(29,36,32,0.25)',
      },
    },
  },
  plugins: [],
};
