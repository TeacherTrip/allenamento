import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// L'app viene pubblicata su https://teachertrip.github.io/allenamento/
export default defineConfig({
  base: '/allenamento/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
