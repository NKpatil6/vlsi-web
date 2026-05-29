import path from 'node:path';
import { defineConfig } from 'vite';
import babel from 'vite-plugin-babel';
import tsconfigPaths from 'vite-tsconfig-paths';
import { loadFontsFromTailwindSource } from './plugins/loadFontsFromTailwindSource';

// Electron build: pure client SPA, no SSR, no server bundle
export default defineConfig({
  base: './',
  root: '.',
  build: {
    outDir: 'build/client',
    emptyOutDir: true,
  },
  envPrefix: 'NEXT_PUBLIC_',
  logLevel: 'info',
  plugins: [
    babel({
      include: ['**/*.js', '**/*.jsx'],
      exclude: ['**/*.ts', '**/*.tsx', /node_modules/],
      babelConfig: {
        babelrc: false,
        configFile: false,
        plugins: [
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
          'styled-jsx/babel',
        ],
      },
    }),
    loadFontsFromTailwindSource(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      lodash: 'lodash-es',
      '@': path.resolve(__dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  clearScreen: false,
});
