import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Task 140: the photo-registration tests do real pixel work and exceed the
    // 5s default on slower machines. This only relaxes the time budget; it does
    // not change any assertion. Task 164: the Task 156 item-coverage test also
    // builds the full map index and ran 37s under full-suite worker contention,
    // just past the old 30s, so the shared budget is 60s.
    testTimeout: 60000,
    // Task 134: the real-PS5-capture eval runs WASM OCR over two photos and takes
    // ~30s. Keep it out of the default run; `npm run test:ocr` picks it up.
    exclude: ['node_modules', 'dist', '.scratch', 'src/**/*.ocr.test.ts'],
  },
})
