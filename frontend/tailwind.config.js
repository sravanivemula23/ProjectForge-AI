/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0F1B2D', 700: '#26364D', 500: '#51627A', 300: '#9AA7B8', 100: '#E4E9EF', 50: '#F4F6F9' },
        signal: { DEFAULT: '#0F9D8A', dark: '#0B7A6B', light: '#DDF3EF' },
        iris: { DEFAULT: '#3B4CCA', light: '#E7EAFB' },
        amber: { signal: '#E8A33D' },
      },
      fontFamily: { display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'], sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
