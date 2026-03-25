import type { Config } from 'tailwindcss';
import sharedPreset from '@cowork/shared-ui/tailwind-preset';

const config: Config = {
  presets: [sharedPreset],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};

export default config;
