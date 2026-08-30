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
        background: '#f1f5f9',
        surface: '#ffffff',
        'surface-hover': '#f8fafc',
        paper: '#ffffff',
        border: '#e2e8f0',
        'border-subtle': 'rgba(0, 0, 0, 0.06)',
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
          hover: '#9c1b3e',
        },
        secondary: {
          DEFAULT: '#B73852',
          emerald: '#16a34a',
        },
        platform: {
          bg: '#f1f5f9',
          bgSecondary: '#ffffff',
          paper: '#ffffff',
          primary: '#790026',
          primaryLight: '#B73852',
          selected: '#ae4f68',
          accent: '#b0697f',
          textPrimary: '#1e293b',
          textSecondary: '#64748b',
        },
        status: {
          up: '#16a34a',
          degraded: '#d97706',
          down: '#BA1B1B',
          timeout: '#7c3aed',
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
        'platform': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
        'platform-card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'platform-glow': '0 0 20px rgba(121, 0, 38, 0.12)',
      }
    },
  },
  plugins: [],
}
