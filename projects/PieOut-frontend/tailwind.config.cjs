/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // kaisei: ['"Kaisei Decol"', 'serif'],
        sans: ['Amatic SC', 'cursive'],
        // sans: ['"Kaisei Decol"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  daisyui: {
    themes: ['lofi'],
    logs: false,
  },
  plugins: [require('daisyui')],
}
