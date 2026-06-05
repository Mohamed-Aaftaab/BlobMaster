import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  target: 'es2020',
  external: [
    'viem',
    'viem/accounts',
    'viem/chains',
    '@filoz/synapse-sdk',
    '@filoz/synapse-core',
    '@filoz/synapse-core/chains',
  ],
})
