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
          'bg': '#F7F8FA',
          'border': '#E5E7EB',
          'text': '#0a0a0a',
          'text-secondary': '#6B7280',
          'text-muted': '#9CA3AF',
          'accent': '#111827',
        },
        success: { DEFAULT: '#196b24', light: '#22c55e' },
        warning: { DEFAULT: '#e97132' },
        info: { DEFAULT: '#156082' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        'tightest': '-0.05em',
      },
      borderRadius: {
        'card': '32px',
        'btn': '100px',
        'dock': '16px',
      },
      boxShadow: {
        'dock': '0 2px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
        'dock-scroll': '0 4px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)',
        'glass': '0 8px 32px 0 rgba(31,38,135,0.07)',
        'glass-hover': '0 12px 40px 0 rgba(31,38,135,0.12)',
        'mockup': '0 20px 60px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.08)',
        'btn-glow': '0 0 20px rgba(17,24,39,0.3)',
      },
    },
  },
  plugins: [],
}
