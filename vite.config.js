import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' makes the build work on GitHub Pages, Firebase Hosting and inside the Android app.
export default defineConfig({
  plugins: [react()],
  base: './',
});
