import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    // ชุดทดสอบเดิมใช้ข้อมูลตัวอย่าง (mockData) — เทสต์ที่ตรวจ Production ตั้งค่านี้เป็น 'false' เอง
    env: { NEXT_PUBLIC_DEMO_MODE: 'true' },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
