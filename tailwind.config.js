/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#7C5CFC',
        'primary-hover': '#6B4EFF',
        background: '#F0F2FA',
        'dark-bg': '#111827',
      },
    },
  },
  plugins: [],
};
