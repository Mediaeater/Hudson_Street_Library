/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,njk,js}",
    "./_site/**/*.html",
    "./generate-book-pages.js"
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        'forest': {
          400: '#a4ac86',  // Olive - lightest
          500: '#7d8471',  // Sage - medium
          600: '#4a6348',  // Forest medium
          700: '#2d4a2b',  // Forest Green - primary
          800: '#243d23',  // Forest dark
          900: '#1b2e1a',  // Forest darkest
        },
        // Backwards compatibility aliases
        'teal': {
          700: '#2d4a2b',
          800: '#243d23',
          900: '#1b2e1a',
        }
      },
      fontFamily: {
        'playfair': ['Playfair Display', 'serif'],
        'montserrat': ['Montserrat', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
