/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // AquaIntel Clean Soft UI Palette
        farm: {
          bg: '#F6F8F6',
          surface: '#FFFFFF',
          secondary: '#EFF4F0',
          mint: '#E3F3E9',
          border: '#E3EAE5',
          borderLight: '#EEF2EF',
          text: '#172820',
          muted: '#68776F',
          mutedLight: '#8C9B93',
        },
        forest: {
          DEFAULT: '#247653',
          dark: '#174D39',
          light: '#2E8B62',
          subtle: '#E8F5ED',
        },
        teal: {
          marine: '#168B91',
          marineDark: '#0E6368',
          marineLight: '#1FB2B9',
          subtle: '#E6F6F7',
        },
        status: {
          success: '#21845A',
          successBg: '#EAF6EE',
          successBorder: '#C6E7D2',
          warning: '#B7791F',
          warningBg: '#FEF7EC',
          warningBorder: '#F6DFB3',
          critical: '#C84040',
          criticalBg: '#FDF2F2',
          criticalBorder: '#F7C8C8',
          info: '#3478B8',
          infoBg: '#EFF6FB',
          infoBorder: '#C3DCF1',
        },
        aqua: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },
      borderRadius: {
        'sm': '8px',
        'md': '10px',
        'lg': '12px',
        'xl': '14px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(30, 60, 45, 0.04)',
        'card': '0 4px 14px rgba(30, 60, 45, 0.05)',
        'elevated': '0 8px 22px rgba(30, 60, 45, 0.07)',
        'floating': '0 12px 30px rgba(30, 60, 45, 0.09)',
        'subtle': '0 1px 3px rgba(30, 60, 45, 0.03)',
        'inset-soft': 'inset 0 1px 2px rgba(30, 60, 45, 0.04)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

