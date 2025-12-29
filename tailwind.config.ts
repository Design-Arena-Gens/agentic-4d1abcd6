import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        nature: {
          green: '#2d5016',
          lightgreen: '#4a7c2c',
          sky: '#87ceeb',
          earth: '#8b7355',
        }
      }
    },
  },
  plugins: [],
}
export default config
