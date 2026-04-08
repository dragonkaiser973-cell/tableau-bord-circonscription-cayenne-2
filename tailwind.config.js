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
        zen: {
          'hero-top': '#C8DDE8',
          'hero-mid': '#D4E8D0',
          'hero-bottom': '#B8D4A8',
          'bg': '#F7F8FA',
          'card': '#FFFFFF',
          'border': '#E5E7EB',
          'border-hover': '#C9CDD4',
          'text': '#1A1A1A',
          'text-secondary': '#6B7280',
          'text-muted': '#9CA3AF',
          'accent': '#111827',
          'accent-hover': '#374151',
          'glass': 'rgba(255,255,255,0.75)',
          'glass-solid': 'rgba(255,255,255,0.88)',
        },
        success: { DEFAULT: '#196b24', light: '#22c55e' },
        warning: { DEFAULT: '#e97132' },
        info: { DEFAULT: '#156082' },
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'card': '24px',
        'btn': '100px',
        'dock': '16px',
      },
      boxShadow: {
        'dock': '0 2px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
        'dock-scroll': '0 4px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)',
        'bento': '0 1px 3px rgba(0,0,0,0.02)',
        'bento-hover': '0 8px 24px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04)',
        'mockup': '0 20px 60px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.06)',
        'btn-hover': '0 6px 20px rgba(0,0,0,0.2)',
      },
      animation: {
        'fade-slide-up': 'fadeSlideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-slide-down': 'fadeSlideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'levitate': 'levitate 4s ease-in-out infinite',
        'icon-pulse': 'iconPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeSlideDown: {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        levitate: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        iconPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.75' },
        },
      },
    },
  },
  plugins: [],
}
