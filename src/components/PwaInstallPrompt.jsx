import React, { useState, useEffect } from 'react';
import './PwaInstallPrompt.css';
import { Download, X, Share, PlusSquare, Sparkles, CheckCircle2 } from 'lucide-react';
import otwjekLogo from '../assets/otwjek_logo.png';
import { getPortalMeta } from '../utils/pwaPortal.js';

export default function PwaInstallPrompt({ portal = 'customer' }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const portalMeta = getPortalMeta(portal);
  const dismissStorageKey = `otwjek_pwa_dismissed_${portalMeta.portal}`;

  useEffect(() => {
    // Cek apakah sudah berjalan di mode standalone (sudah diinstall)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      setShowPrompt(false);
      return;
    }

    // Cek apakah user pernah menutup banner pada portal ini dalam sesi ini
    const isDismissed = sessionStorage.getItem(dismissStorageKey);
    if (isDismissed) {
      setShowPrompt(false);
    }

    // Deteksi perangkat iOS (Safari)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Event listener untuk Chromium (Chrome, Edge, Samsung Internet, dll.)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!sessionStorage.getItem(dismissStorageKey)) {
        setShowPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Untuk iOS jika belum standalone, tampilkan opsi setelah beberapa detik
    let timer = null;
    if (isIosDevice && !isStandalone && !isDismissed) {
      timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (timer) clearTimeout(timer);
    };
  }, [dismissStorageKey]);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem(dismissStorageKey, 'true');
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <>
      {/* Floating PWA Install Bar */}
      <div
        className={`pwa-install-banner ${portalMeta.portal === 'admin' ? 'is-admin' : ''}`}
        role="banner"
        aria-label={`Instal ${portalMeta.appName}`}
      >
        <div className="pwa-banner-content">
          <div className="pwa-banner-icon-wrap">
            <img src={otwjekLogo} alt={portalMeta.appName} className="pwa-banner-app-icon" />
          </div>

          <div className="pwa-banner-text">
            <div className="pwa-banner-title">
              {portalMeta.installTitle}
              <Sparkles size={13} className="pwa-sparkle-icon" />
            </div>
            <div className="pwa-banner-subtitle">
              {portalMeta.installSubtitle}
            </div>
          </div>
        </div>

        <div className="pwa-banner-actions">
          <button
            type="button"
            className="btn-pwa-install"
            onClick={handleInstallClick}
            aria-label={`Instal ${portalMeta.appName}`}
          >
            <Download size={15} />
            <span>Instal</span>
          </button>

          <button
            type="button"
            className="btn-pwa-close"
            onClick={handleDismiss}
            aria-label="Tutup Banner"
            title="Tutup"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* iOS Safari Installation Guide Modal */}
      {showIosGuide && (
        <div className="pwa-ios-modal-backdrop" onClick={() => setShowIosGuide(false)}>
          <div className="pwa-ios-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="pwa-ios-modal-header">
              <div className="pwa-ios-modal-title">Pasang {portalMeta.appName} di iPhone / iPad</div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowIosGuide(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pwa-ios-steps">
              <div className="pwa-step-item">
                <div className="pwa-step-num">1</div>
                <div className="pwa-step-desc">
                  Ketuk tombol <strong>Bagikan (Share)</strong> <Share size={16} className="inline-icon" /> di bilah bawah browser Safari.
                </div>
              </div>

              <div className="pwa-step-item">
                <div className="pwa-step-num">2</div>
                <div className="pwa-step-desc">
                  Gulir ke bawah dan pilih <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> (Add to Home Screen) <PlusSquare size={16} className="inline-icon" />.
                </div>
              </div>

              <div className="pwa-step-item">
                <div className="pwa-step-num">3</div>
                <div className="pwa-step-desc">
                  Ketuk <strong>&quot;Tambah&quot; (Add)</strong> di pojok kanan atas. Ikon aplikasi <strong>{portalMeta.appName}</strong> akan langsung muncul di layar utama!
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn-pwa-understand"
              onClick={() => setShowIosGuide(false)}
            >
              <CheckCircle2 size={16} />
              <span>Saya Mengerti</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
