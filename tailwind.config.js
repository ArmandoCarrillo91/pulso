/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-plus-jakarta)'],
      },
      colors: {
        positive: '#16a34a',
        negative: '#dc2626',
      },
      borderRadius: {
        card: '16px',
        btn: '12px',
      },
      maxWidth: {
        app: '430px',
      },
    },
  },
  plugins: [],
}
