import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Middleware dev & preview agar /driver dan /admin langsung menyajikan HTML
 * dengan <link rel="manifest"> masing-masing tanpa redirect (200 OK),
 * sehingga browser mengenali Customer (/), Driver (/driver), dan Admin (/admin)
 * sebagai 3 PWA mini app yang terpisah di origin yang sama.
 */
function multiPortalPwaRoutingPlugin() {
  const rewritePortalUrl = (req, _res, next) => {
    const rawUrl = req.url || '/';
    const qIdx = rawUrl.indexOf('?');
    const pathname = (qIdx >= 0 ? rawUrl.slice(0, qIdx) : rawUrl).toLowerCase();
    const search = qIdx >= 0 ? rawUrl.slice(qIdx) : '';

    if (pathname === '/driver' || pathname === '/driver/') {
      req.url = `/driver/index.html${search}`;
    } else if (pathname === '/admin' || pathname === '/admin/') {
      req.url = `/admin/index.html${search}`;
    }
    next();
  };

  return {
    name: 'otwjek-multi-portal-pwa-routing',
    configureServer(server) {
      server.middlewares.use(rewritePortalUrl);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewritePortalUrl);
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    multiPortalPwaRoutingPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // Gunakan manifest terpisah per portal di public/ (manifest.webmanifest, manifest-driver.webmanifest, manifest-admin.webmanifest)
      manifest: false,
      includeAssets: [
        'favicon.ico',
        'favicon.png',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-512x512.png',
        'logo.png',
        'manifest.webmanifest',
        'manifest-driver.webmanifest',
        'manifest-admin.webmanifest'
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        maximumFileSizeToCacheInBytes: 3000000,
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/mt[0-3]\.google\.com\/vt\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-maps-tiles-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        driver: resolve(__dirname, 'driver/index.html'),
        admin: resolve(__dirname, 'admin/index.html')
      }
    }
  }
});
