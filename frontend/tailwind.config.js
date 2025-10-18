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
            DEFAULT: '#8B7AB8',
            light: '#B4A5D5',
            dark: '#5D4E7A',
            pale: '#D5CAED',
          },
          blue: {
            DEFAULT: '#6B85B2',
            light: '#9DAECC',
            midnight: '#2D3E5C',
            soft: '#C8D6E8',
          },
          yellow: {
            DEFAULT: '#F9C97C',
            light: '#FFDDA1',
            soft: '#FFE8B8',
            glow: '#FFD56B',
          },
          cream: {
            DEFAULT: '#FFF9F0',
            warm: '#FFF3E0',
            dark: '#F5E6D3',
          },
          green: {
            soft: '#B8D4B8',
            mint: '#D4EBD4',
          },
          pink: {
            soft: '#F5C6D8',
            blush: '#FFDEE8',
          }
        }
      },
      fontFamily: {
        'display': ['"Fredoka"', '"Quicksand"', '"Nunito"', 'sans-serif'],
        'body': ['"Quicksand"', '"Nunito"', 'sans-serif'],
      },
      backgroundImage: {
        'bedtime-gradient': 'linear-gradient(135deg, #D5CAED 0%, #C8D6E8 50%, #B4A5D5 100%)',
        'bedtime-radial': 'radial-gradient(ellipse at top, #D5CAED, #C8D6E8, #9DAECC)',
        'soft-gradient': 'linear-gradient(to bottom, #FFF9F0, #F5E6D3)',
      }
    },
  },
  plugins: [],
}
