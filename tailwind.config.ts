import type { Config } from 'tailwindcss';
import daisyui from 'daisyui';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        light: {
          primary: '#0f1b3d',
          'primary-content': '#ffffff',
          secondary: '#c9a84c',
          'secondary-content': '#0f1b3d',
          accent: '#3b6fa0',
          neutral: '#1e293b',
          'base-100': '#ffffff',
          'base-200': '#f5f3ee',
          'base-300': '#e8e4dd',
          info: '#3b82f6',
          success: '#16a34a',
          warning: '#d97706',
          error: '#dc2626',
        },
        dark: {
          primary: '#c9a84c',
          'primary-content': '#0f1b3d',
          secondary: '#3b6fa0',
          'secondary-content': '#ffffff',
          accent: '#f0d78c',
          neutral: '#0a0a1a',
          'base-100': '#0f172a',
          'base-200': '#111c33',
          'base-300': '#1e293b',
          info: '#60a5fa',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
        },
      },
    ],
  },
} satisfies Config;
