import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#0B0A14',
        spore: '#16142A',
        ultra: '#7A3CFF',
        xenon: '#C6FF3D',
        nebula: '#19F0C3',
        pink: '#FF3D9A',
        mist: '#EDEBFF',
      },
    },
  },
  plugins: [],
};
export default config;
