import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#181715',
        'bg-editor': '#1d1c19',
        surface: '#22211e',
        'surface-hover': '#292824',
        border: '#2e2d29',
        'border-light': '#252420',
        'text-primary': '#ede8dc',
        'text-secondary': '#9d9788',
        'text-muted': '#5c584e',
        accent: '#d4a853',
        'accent-hover': '#e0bc6e',
        'accent-subtle': 'rgba(212, 168, 83, 0.12)',
        success: '#7d9f6a',
        warning: '#c4945a',
        error: '#c46a5a',
      },
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
      boxShadow: {
        'panel': '0 0 0 1px rgba(255,255,255,0.04)',
        'dialog': '0 24px 80px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
};

export default config;
