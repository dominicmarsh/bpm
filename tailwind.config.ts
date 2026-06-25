import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#000000',
        card: '#111111',
        border: '#242424',
        'text-primary': '#f0f0f0',
        'text-secondary': '#888888',
        accent: '#e53e3e',
        stress: '#f59e0b',
        positive: '#22c55e',
      },
    },
  },
  plugins: [],
}

export default config
