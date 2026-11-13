/**
 * Konfigurasi & sinkronisasi metadata PWA untuk 3 Mini App terpisah:
 * - customer (/)
 * - driver (/driver)
 * - admin (/admin)
 */

export const PORTAL_PWA_META = {
  customer: {
    portal: 'customer',
    appName: 'OTWJek',
    title: 'OTWJek',
    appleTitle: 'OTWJek',
    themeColor: '#FF337F',
    manifestHref: '/manifest.webmanifest?v=3',
    startPath: '/',
    installTitle: 'Pasang Mini App OTWJek',
    installSubtitle: 'Aplikasi Pelanggan · Akses cepat & hemat kuota'
  },
  driver: {
    portal: 'driver',
    appName: 'OTWJek Driver',
    title: 'OTWJek Driver',
    appleTitle: 'OTWJek Driver',
    themeColor: '#E11D6F',
    manifestHref: '/manifest-driver.webmanifest?v=3',
    startPath: '/driver',
    installTitle: 'Pasang OTWJek Driver',
    installSubtitle: 'Mini App Mitra Driver · Kelola status & terima order'
  },
  admin: {
    portal: 'admin',
    appName: 'OTWJek Admin',
    title: 'OTWJek Admin',
    appleTitle: 'OTWJek Admin',
    themeColor: '#0F172A',
    manifestHref: '/manifest-admin.webmanifest?v=3',
    startPath: '/admin',
    installTitle: 'Pasang OTWJek Admin',
    installSubtitle: 'Mini App Admin · Verifikasi mitra & tugaskan order'
  }
};

export function getPortalFromLocation(pathname = '', hash = '') {
  const p = String(pathname || '').toLowerCase();
  const h = String(hash || '').toLowerCase();
  if (p === '/admin' || p.startsWith('/admin/') || h === '#/admin' || h.startsWith('#/admin/')) {
    return 'admin';
  }
  if (p === '/driver' || p.startsWith('/driver/') || h === '#/driver' || h.startsWith('#/driver/')) {
    return 'driver';
  }
  return 'customer';
}

export function getPortalMeta(portal) {
  return PORTAL_PWA_META[portal] || PORTAL_PWA_META.customer;
}

export function syncPortalDocumentMeta(portal) {
  if (typeof document === 'undefined') return getPortalMeta(portal);
  const meta = getPortalMeta(portal);

  document.title = meta.title;

  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (manifestLink && manifestLink.getAttribute('href') !== meta.manifestHref) {
    manifestLink.setAttribute('href', meta.manifestHref);
  }

  const updateMetaContent = (selector, value) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute('content', value);
  };

  updateMetaContent('meta[name="theme-color"]', meta.themeColor);
  updateMetaContent('meta[name="msapplication-TileColor"]', meta.themeColor);
  updateMetaContent('meta[name="apple-mobile-web-app-title"]', meta.appleTitle);
  updateMetaContent('meta[name="application-name"]', meta.appName);

  return meta;
}
