/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#141A21',
        surface: '#1C252E',
        'surface-hover': '#24303c',
        paper: '#28323D',
        border: 'rgba(255, 255, 255, 0.08)',
        'border-light': 'rgba(0, 0, 0, 0.08)',
        primary: {
          50: '#fdf2f4',
          100: '#fbe6ea',
          200: '#f7cfd8',
          300: '#f0a8b9',
          400: '#e57593',
          500: '#b73852',
          600: '#9c1b3e',
          700: '#790026',
          800: '#670322',
          900: '#580820',
          DEFAULT: '#790026',
          light: '#B73852',
          dark: '#580820',
          hover: '#ae4f68',
        },
        secondary: {
          DEFAULT: '#B73852',
          emerald: '#38B79D',
        },
        platform: {
          bg: '#141A21',
          bgSecondary: '#1C252E',
          paper: '#28323D',
          primary: '#790026',
          primaryLight: '#B73852',
          selected: '#ae4f68',
          accent: '#b0697f',
          textPrimary: '#FAFAFA',
          textSecondary: '#9FA6AD',
        },
        status: {
          up: '#10b981',
          degraded: '#f59e0b',
          down: '#BA1B1B',
          timeout: '#8b5cf6',
        }
      },
      fontFamily: {
        sans: ['Urbanist', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '28px',
      },
      boxShadow: {
        'platform': '0px 4px 20px rgba(0, 0, 0, 0.15)',
        'platform-glow': '0px 0px 25px rgba(121, 0, 38, 0.25)',
      }
    },
  },
  plugins: [],
}
