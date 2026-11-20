import path from 'node:path'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // In development the app calls /api and Vite forwards it to the real API.
  // This keeps the refresh_token cookie (SameSite=Lax, Path=/auth) same-site.
  const apiTarget = env.API_PROXY_TARGET || 'https://nudge-api.estebanlt.com'

  return {
    plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
          cookieDomainRewrite: '',
          cookiePathRewrite: { '/auth': '/api/auth' },
          configure: (proxy) => {
            // The API's CORS only matters for cross-origin calls; drop Origin so the proxied call looks server-side.
            proxy.on('proxyReq', (req) => req.removeHeader('origin'))
          },
        },
      },
    },
  }
})
