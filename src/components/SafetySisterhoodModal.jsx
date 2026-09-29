import React from 'react';
import { X, ShieldCheck, Heart, Sparkles, PhoneCall, Lock, AlertCircle } from 'lucide-react';
import { ADMINS } from '../data/admins.js';
import { buildWhatsAppLink } from '../utils/whatsappTemplate.js';

export default function SafetySisterhoodModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const handlePanicSOS = () => {
    const text = `🚨 *PANGGILAN BANTUAN DARURAT SISTERHOOD SHE-RIDE* 🚨

Mohon bantuan darurat untuk pemesanan saya. Saya membutuhkan respon cepat admin sekarang juga. Terima kasih!`;
    const url = buildWhatsAppLink(ADMINS[0].phone, text);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-tag">Sisterhood Protection</span>
            <h2 className="modal-heading">Standar Keselamatan Perempuan</h2>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="safety-grid">
            <div className="safety-pillar-card">
              <div className="pillar-icon-box">
                <ShieldCheck size={20} color="#E15B88" />
              </div>
              <div className="pillar-text">
                <strong>Verifikasi Gender Terjamin</strong>
                <p>Seluruh mitra driver diverifikasi tatap muka & KTP perempuan sebelum dapat menerima pesanan.</p>
              </div>
            </div>

            <div className="safety-pillar-card">
              <div className="pillar-icon-box">
                <Lock size={20} color="#8C68CD" />
              </div>
              <div className="pillar-text">
                <strong>Privasi Data Pelanggan</strong>
                <p>Nomor kontak tidak diunggah ke database terbuka, melainkan langsung diteruskan ke WhatsApp Admin resmi.</p>
              </div>
            </div>

            <div className="safety-pillar-card">
              <div className="pillar-icon-box">
                <Sparkles size={20} color="#FF9A76" />
              </div>
              <div className="pillar-text">
                <strong>Higienis & Perlengkapan Wanita</strong>
                <p>Tersedia pelindung rambut (hairnet) gratis sekali pakai dan helm yang disterilkan secara berkala.</p>
              </div>
            </div>

            <div className="safety-pillar-card">
              <div className="pillar-icon-box">
                <AlertCircle size={20} color="#2CB67D" />
              </div>
              <div className="pillar-text">
                <strong>Dual Admin Monitoring</strong>
                <p>Setiap perjalanan terpantau secara administratif oleh 2 nomor Admin WhatsApp yang responsif.</p>
              </div>
            </div>
          </div>

          <div className="sos-emergency-box">
            <div className="sos-info">
              <strong>Butuh Bantuan Mendesak?</strong>
              <p>Tim admin siaga membantu kendala keselamatan selama operasional.</p>
            </div>
            <button className="btn-sos-call" onClick={handlePanicSOS}>
              <PhoneCall size={16} />
              <span>SOS Bantuan Admin</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .modal-tag {
          font-size: 11px;
          font-weight: 700;
          color: var(--primary);
          text-transform: uppercase;
        }

        .modal-heading {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-main);
          margin-top: 2px;
        }

        .safety-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }

        .safety-pillar-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: #FAF9FC;
          border: 1px solid var(--border-neutral);
          border-radius: var(--radius-md);
          padding: 12px;
        }

        .pillar-icon-box {
          width: 36px;
          height: 36px;
          background: white;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-sm);
          flex-shrink: 0;
        }

        .pillar-text strong {
          font-size: 13px;
          color: var(--text-main);
          display: block;
          margin-bottom: 2px;
        }

        .pillar-text p {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .sos-emergency-box {
          background: #FFF2F5;
          border: 1.5px solid rgba(225, 91, 136, 0.3);
          border-radius: var(--radius-md);
          padding: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .sos-info strong {
          font-size: 13px;
          color: var(--primary);
          display: block;
        }

        .sos-info p {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .btn-sos-call {
          background: #E15B88;
          color: white;
          border: none;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          transition: var(--transition);
        }

        .btn-sos-call:hover {
          background: #CE4774;
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
}
