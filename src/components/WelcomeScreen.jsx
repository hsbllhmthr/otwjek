import React, { useState } from 'react';
import './WelcomeScreen.css';
import { X as CloseIcon } from 'lucide-react';
import otwjekLogo from '../assets/otwjek_logo.png';

export default function WelcomeScreen({ onContinue, onSignUp, onSignIn, onRegisterDriver }) {
  const [activeModal, setActiveModal] = useState(null); // 'terms' | 'privacy' | null

  return (
    <div className="welcome-screen-container">
      {/* Main Viewport Content Area */}
      <div className="welcome-main-content">
        <div className="welcome-center-section">
          {/* App Logo */}
          <div className="welcome-logo-wrapper">
            <div className="welcome-brand-mark">
              <img
                src={otwjekLogo}
                alt="OTWJek Logo"
                className="welcome-logo-img"
              />
            </div>
          </div>

          {/* Heading & Subtitle in Indonesian */}
          <div className="welcome-text-group">
            <h1 className="welcome-title">Selamat Datang!</h1>
            <p className="welcome-subtitle">Masuk atau buat akun untuk melanjutkan perjalanan</p>
          </div>

          {/* Centered Action Buttons (Daftar & Masuk) */}
          <div className="welcome-action-group">
            {/* Daftar (Sign up) button */}
            <button
              type="button"
              className="btn-welcome-signup"
              onClick={onSignUp || onContinue}
            >
              Daftar
            </button>

            {/* Masuk (Sign in) button */}
            <button
              type="button"
              className="btn-welcome-signin"
              onClick={onSignIn || onContinue}
            >
              Masuk
            </button>
          </div>

          {/* Driver Registration Entry */}
          <div className="welcome-skip-wrapper">
            <button
              type="button"
              className="btn-welcome-skip"
              onClick={onRegisterDriver || onSignUp || onContinue}
            >
              Daftar sebagai mitra driver
            </button>
          </div>
        </div>

        {/* Footer Legal Links in Indonesian */}
        <div className="welcome-footer-legal">
          <button
            type="button"
            className="btn-legal-link"
            onClick={() => setActiveModal('privacy')}
          >
            Kebijakan Privasi
          </button>
          <span className="legal-dot">·</span>
          <button
            type="button"
            className="btn-legal-link"
            onClick={() => setActiveModal('terms')}
          >
            Syarat & Ketentuan
          </button>
        </div>
      </div>

      {/* Modal: Syarat & Ketentuan atau Kebijakan Privasi */}
      {(activeModal === 'terms' || activeModal === 'privacy') && (
        <div className="welcome-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div
            className="welcome-modal-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="welcome-modal-header">
              <h3 className="modal-heading">
                {activeModal === 'terms' ? 'Syarat & Ketentuan' : 'Kebijakan Privasi'}
              </h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setActiveModal(null)}
              >
                <CloseIcon size={18} />
              </button>
            </div>
            <div className="modal-legal-content">
              {activeModal === 'terms' ? (
                <>
                  <p>
                    Selamat datang di platform transportasi online kami. Dengan menggunakan layanan ini, Anda menyetujui ketentuan berikut:
                  </p>
                  <ul>
                    <li>Layanan perjalanan aman, transparan, dan terpercaya khusus perempuan.</li>
                    <li>Tarif transparan disesuaikan dengan jarak dan waktu rute perjalanan.</li>
                    <li>Pemesanan terintegrasi langsung dengan WhatsApp dispatcher dan mitra driver resmi.</li>
                  </ul>
                </>
              ) : (
                <>
                  <p>
                    Privasi dan keamanan data Anda adalah prioritas utama kami:
                  </p>
                  <ul>
                    <li>Data koordinat GPS dan lokasi penjemputan hanya digunakan untuk kalkulasi navigasi perjalanan.</li>
                    <li>Informasi kontak Anda dijaga kerahasiaannya sesuai standar perlindungan data pribadi.</li>
                  </ul>
                </>
              )}
            </div>
            <button
              type="button"
              className="btn-modal-submit"
              onClick={() => setActiveModal(null)}
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
