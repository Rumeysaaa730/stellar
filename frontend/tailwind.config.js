/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary:  '#0F172A',
          secondary:'#131D2E',
          card:     '#1A2742',
          elevated: '#1E293B',
          border:   '#2D3F57',
        },
        brand: {
          primary:  '#3B82F6',
          secondary:'#8B5CF6',
          accent:   '#06B6D4',
          glow:     '#3B82F633',
        },
        stellar: {
          blue:   '#3B82F6',
          purple: '#8B5CF6',
          cyan:   '#06B6D4',
        },
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          error:   '#EF4444',
          info:    '#3B82F6',
          pending: '#F97316',
        },
        text: {
          primary:   '#F8FAFC',
          secondary: '#94A3B8',
          muted:     '#64748B',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'system-ui', 'sans-serif'],
        mono:    ['"Fira Code"', 'monospace'],
      },
      boxShadow: {
        glow:    '0 0 24px rgba(59, 130, 246, 0.35)',
        'glow-sm':'0 0 12px rgba(59, 130, 246, 0.2)',
        'glow-purple':'0 0 24px rgba(139, 92, 246, 0.35)',
        card:    '0 4px 24px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':  'fadeIn 0.25s ease-in-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' },                                        '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(12px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
};
