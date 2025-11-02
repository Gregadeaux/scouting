import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use happy-dom for faster DOM simulation (alternative: jsdom)
    environment: 'happy-dom',

    // Include patterns for test files
    include: ['**/*.{test,spec}.{ts,tsx}'],

    // Exclude patterns
    exclude: [
      'node_modules',
      '.next',
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      '**/*.spec.ts', // Exclude Playwright E2E tests
    ],

    // Setup file to run before each test file
    setupFiles: ['./tests/setup.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules',
        '.next',
        'dist',
        'coverage',
        'playwright-report',
        'test-results',
        '**/*.d.ts',
        '**/*.config.{ts,js}',
        '**/types/**',
        'tests/**',
        'scripts/**',
        'public/**',
      ],
      // Coverage thresholds (starting point - increase gradually)
      thresholds: {
        lines: 60,
        functions: 45,
        branches: 60,
        statements: 60,
      },
    },

    // Global test timeout (10 seconds)
    testTimeout: 10000,

    // Globals (makes describe, it, expect available without imports)
    globals: true,

    // Clear mocks between tests
    clearMocks: true,

    // Restore mocks between tests
    restoreMocks: true,
  },

  // Path aliases (must match tsconfig.json)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
