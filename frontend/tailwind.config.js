/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bedtime: {
          purple: {
            DEFAULT: '#6B46C1',
            light: '#9F7AEA',
            dark: '#4C1D95',
          },
          blue: {
            DEFAULT: '#2C3E75',
            light: '#4A5F9F',
            midnight: '#1A1F3A',
          },
          yellow: {
            DEFAULT: '#FDB44B',
            light: '#FED580',
            soft: '#FFEAA7',
          },
          cream: {
            DEFAULT: '#FFF5E8',
            warm: '#FFE8D1',
          }
        }
      },
      fontFamily: {
        'child': ['"Comic Sans MS"', 'Comic Sans', 'cursive', 'sans-serif'],
      },
      backgroundImage: {
        'bedtime-gradient': 'linear-gradient(to bottom, #6B46C1, #2C3E75)',
        'bedtime-radial': 'radial-gradient(circle at top, #6B46C1, #2C3E75, #1A1F3A)',
      }
    },
  },
  plugins: [],
}
