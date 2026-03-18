import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
  base: mode === 'production' ? '/english-mentor-buddy/' : '/',
  server: {
    // bind to localhost and use a different port to avoid conflicts with other local services
    host: 'localhost',
    port: 5173,
    // HTTPS is enabled via basicSsl plugin
    proxy: {
      "/api": {
        target: "https://localhost:5000", // Local API endpoint (HTTPS)
        changeOrigin: true,
        secure: false, // Allow self-signed certificates
        rewrite: (path) => path,
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}});