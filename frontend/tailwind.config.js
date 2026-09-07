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
          50: '#edf5fb',
          100: '#d9eaf5',
          200: '#b8d0e3',
          300: '#8fb4d0',
          400: '#6f9fc2',
          500: '#5c8fb8',
          600: '#3d749f',
          700: '#245b87',
          800: '#1b496d',
          900: '#143953',
          DEFAULT: '#245b87',
          light: '#5c8fb8',
          dark: '#1b496d',
          hover: '#1b496d',
        },
        secondary: {
          DEFAULT: '#b8c6d3',
          emerald: '#16a34a',
        },
        platform: {
          bg: '#f1f5f9',
          bgSecondary: '#ffffff',
          paper: '#ffffff',
          primary: '#245b87',
          primaryLight: '#5c8fb8',
          selected: '#3d749f',
          accent: '#8fb4d0',
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
        'platform-glow': '0 0 20px rgba(36, 91, 135, 0.12)',
      }
    },
  },
  plugins: [],
}
