import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f172a',
        card: '#1e293b',
        border: '#334155',
        'text-primary': '#e2e8f0',
        'text-secondary': '#94a3b8',
        accent: '#3b82f6',
        stress: '#f59e0b',
        positive: '#10b981',
      },
    },
  },
  plugins: [],
}

export default config
