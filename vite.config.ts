import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

/**
 * Two pages, not one.
 *
 *   index.html  the front door — a static page with its own canvas work and
 *               no React in it at all. It sells the thing.
 *   play.html   the game, the Academy and the teacher side: one React app,
 *               served at /play and at /teach.
 *
 * Keeping them apart means the landing page's animations cannot break the
 * game, and loading the front door does not download a 2 MB bundle to read
 * four paragraphs.
 */

/** in dev, serve the app for the paths the production server rewrites */
const appRoutes = (): Plugin => ({
  name: 'novus-app-routes',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const url = (req.url ?? '').split('?')[0]
      if (/^\/(play|teach)(\/|$)/.test(url)) req.url = '/play.html'
      next()
    })
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss(), appRoutes()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(import.meta.dirname, 'index.html'),
        play: path.resolve(import.meta.dirname, 'play.html'),
      },
    },
  },
})
