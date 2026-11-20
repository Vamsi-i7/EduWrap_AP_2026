/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          100: '#F7F2E8', // Page canvas
          150: '#F2EAE0', // Inputs, tags, hover
          200: '#EFE6D5', // Rail & outer frame
        },
        ivory: {
          50: '#FDFBF7',  // Tile surface
        },
        sand: {
          300: '#E2D6C5', // Borders & dividers
        },
        espresso: {
          500: '#8C7664', // Muted text, captions
          700: '#5E4B3B', // Secondary text
          900: '#2C2016', // Primary headings & text
        },
        amber: {
          400: '#DB8B3B', // Hover
          500: '#C8792C', // Primary accent, buttons, active
          600: '#A8641F', // Pressed
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        tile: '0 1px 3px rgba(44, 32, 22, 0.05)',
        glow: '0 0 15px rgba(200, 121, 44, 0.25)',
      },
    },
  },
  plugins: [],
}
