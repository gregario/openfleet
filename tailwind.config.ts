import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        fleet: {
          green: '#22c55e',
          orange: '#f59e0b',
          red: '#ef4444',
          bg: '#f8fafc',
          sidebar: '#1e293b',
          'sidebar-hover': '#334155',
          'sidebar-active': '#475569',
        },
      },
    },
  },
  plugins: [],
};
export default config;
