/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        earth: {
          50: '#fbf9f5',
          100: '#f5f0e6',
          200: '#ebdcc8',
          300: '#dec4a3',
          400: '#cca478',
          500: '#bd8b57',
          600: '#ab7548',
          700: '#8e5e3c',
          800: '#734c34',
          900: '#5e3f2d',
        },
      },
      fontFamily: {
        sans: ['Prompt', 'Sarabun', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(22, 163, 74, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'float': '0 12px 36px -4px rgba(22, 163, 74, 0.15), 0 4px 12px -2px rgba(0, 0, 0, 0.06)',
      },
      aspectRatio: {
        '16/9': '16 / 9',
        '21/9': '21 / 9',
        '3/1': '3 / 1',
        '4/3': '4 / 3',
      }
    },
  },
  plugins: [],
};
