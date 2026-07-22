import { defineConfig } from "vite"

export default defineConfig({
  base: "./",
  root: "./src",
  publicDir: "../public",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    // Keep the upstream output portable without requiring Terser's optional package.
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"], // Separate Three.js into its own chunk for better caching
        },
      },
    },
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
    reportCompressedSize: true,
  },
  server: {
    port: 5173,
    open: true,
  },
})
