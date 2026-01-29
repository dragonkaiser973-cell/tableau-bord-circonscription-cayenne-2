/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f3f7',
          100: '#cce7ef',
          200: '#99cfe0',
          300: '#66b7d0',
          400: '#339fc1',
          500: '#2d8ba8',
          600: '#1e7a95',
          700: '#1e5a78',
          800: '#17495f',
          900: '#0f3847',
        },
        success: {
          DEFAULT: '#196b24',
          light: '#22c55e',
        },
        warning: {
          DEFAULT: '#e97132',
        },
        info: {
          DEFAULT: '#156082',
        }
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
