import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['.scratch/173/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 120000,
  },
})
