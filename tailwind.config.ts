import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        amazon: '#FF9900',
        etsy: '#F56400',
        shopify: '#96BF48',
      }
    }
  },
  plugins: [],
}
export default config
