import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Task 134: the real-PS5-capture eval runs WASM OCR over two photos and takes
    // ~30s. Keep it out of the default run; `npm run test:ocr` picks it up.
    exclude: ['node_modules', 'dist', '.scratch', 'src/**/*.ocr.test.ts'],
  },
})
