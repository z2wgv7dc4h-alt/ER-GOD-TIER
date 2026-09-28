import { defineConfig } from 'vitest/config'

/**
 * Task 134 — slow OCR eval config. Runs only the real-PS5-capture tests
 * (`*.ocr.test.ts`) that are excluded from the default suite because they push
 * the photos through WASM Tesseract. Invoke with `npm run test:ocr`.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.ocr.test.ts'],
    testTimeout: 600_000,
    hookTimeout: 120_000,
  },
})
