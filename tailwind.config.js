/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Tweak in M6 (tag-style) and M8 (due-tint)
        feature: '#10B981', // emerald
        bug: '#DC2626',     // crimson

        brand: {
          primary: '#0F766E',
          accent: '#0F5F59',
        },
        surface: {
          page: '#F4F6F8',
          card: '#FFFFFF',
        },
        text: {
          primary: '#0F172A',
          muted: '#596579',
        },
        type: {
          feature: '#4F46E5',
          bug: '#C026D3',
        },
        due: {
          safe: '#065F46',
          warning: '#92400E',
          overdue: '#B91C1C',
          neutral: '#526174',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
