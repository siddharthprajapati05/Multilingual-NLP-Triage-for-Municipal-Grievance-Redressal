/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary warm brown palette
        primary: {
          50:  '#fdf8f0',
          100: '#faefd9',
          200: '#f5ddb3',
          300: '#ecc57d',
          400: '#e1a74a',
          500: '#c8852a',
          600: '#a86520',
          700: '#8a4e1c',
          800: '#6e3d1a',
          900: '#5a3218',
        },
        // Warm beige neutrals
        warm: {
          50:  '#fefcf8',
          100: '#fdf8f0',
          200: '#faf0de',
          300: '#f5e5c5',
          400: '#edd4a3',
          500: '#d9b878',
          600: '#c09555',
          700: '#9a7240',
          800: '#7a5830',
          900: '#614525',
        },
        // Status colors
        status: {
          pending:    '#e8a430',
          inProgress: '#3b82f6',
          resolved:   '#22c55e',
          rejected:   '#ef4444',
        },
        urgency: {
          high:   '#ef4444',
          medium: '#f59e0b',
          low:    '#22c55e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card':   '0 2px 8px rgba(139, 90, 43, 0.08), 0 1px 3px rgba(139, 90, 43, 0.05)',
        'card-hover': '0 8px 24px rgba(139, 90, 43, 0.14), 0 2px 8px rgba(139, 90, 43, 0.08)',
        'modal':  '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}
