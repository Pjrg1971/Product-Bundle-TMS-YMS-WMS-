import type { Config } from 'tailwindcss';
import preset from '@cowork/shared-ui/tailwind-preset';

export default {
  presets: [preset],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
} satisfies Config;
