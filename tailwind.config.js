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
    // Size-only tuples (no line-height) — line-height is owned by
    // design-system.css's hand-written rules and h/p element defaults.
    // Scale must stay in sync with design-system.css's .text-* values.
    fontSize: {
      'xs': ['12px'],
      'sm': ['14px'],
      'base': ['16px'],
      'lg': ['18px'],
      'xl': ['20px'],
      '2xl': ['24px'],
      '3xl': ['32px'],
      '4xl': ['40px'],
      '5xl': ['48px'],
      '6xl': ['60px'],
      '7xl': ['72px'],
    },
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
