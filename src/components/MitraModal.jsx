import React from 'react';
import { X, CheckCircle2, ShieldCheck, Heart, Sparkles, Send } from 'lucide-react';
import { buildWhatsAppLink } from '../utils/whatsappTemplate.js';
import { ADMINS } from '../data/admins.js';

export default function MitraModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const handleApplyWhatsApp = () => {
    const text = `Halo Admin OTWJek, saya berminat mendaftar sebagai *Mitra Pengemudi Perempuan (Driver Wanita)*.

🌸 *Nama Lengkap*: 
🛵 *Tipe Kendaraan*: [Motor / Mobil]
📍 *Domisili / Area*: 
📱 *No WhatsApp*: 

Mohon informasi langkah pendaftaran dan verifikasi identitas selanjutnya. Terima kasih!`;

    const url = buildWhatsAppLink(ADMINS[0].phone, text);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-tag">Kemitraan Khusus Perempuan</span>
            <h2 className="modal-heading">Gabung Jadi Mitra Pengemudi OTWJek</h2>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="banner-sisterhood">
            <Heart size={20} fill="#E15B88" color="#E15B88" />
            <div>
              <strong>Ruang Aman untuk Perempuan Berpenghasilan</strong>
              <p>Mendukung kemandirian finansial perempuan dalam ekosistem transportasi yang saling melindungi.</p>
            </div>
          </div>

          <h3 className="section-subheading">Keuntungan Bergabung:</h3>
          <div className="benefits-list">
            <div className="benefit-item">
              <CheckCircle2 size={16} className="check-icon" />
              <div>
                <strong>100% Penumpang Perempuan</strong>
                <p>Bebas cemas dan rasa khawatir saat mengemudi di jam pagi maupun malam hari.</p>
              </div>
            </div>

            <div className="benefit-item">
              <CheckCircle2 size={16} className="check-icon" />
              <div>
                <strong>Waktu Kerja Bebas & Fleksibel</strong>
                <p>Tentukan jam mengemudi Anda sendiri. Sangat ideal untuk Ibu Rumah Tangga maupun Mahasiswi.</p>
              </div>
            </div>

            <div className="benefit-item">
              <CheckCircle2 size={16} className="check-icon" />
              <div>
                <strong>Bagi Hasil Adil & Transparan</strong>
                <p>Tarif masuk langsung tanpa potongan sistem yang rumit.</p>
              </div>
            </div>

            <div className="benefit-item">
              <CheckCircle2 size={16} className="check-icon" />
              <div>
                <strong>Komunitas Sisterhood</strong>
                <p>Grup komunikasi dan pendampingan sesama pengemudi perempuan yang saling peduli.</p>
              </div>
            </div>
          </div>

          <h3 className="section-subheading">Persyaratan Pendaftaran:</h3>
          <ul className="requirements-list">
            <li>Perempuan WNI berusia 18 - 55 tahun.</li>
            <li>Memiliki KTP & SIM C aktif (untuk motor) atau SIM A aktif (untuk mobil).</li>
            <li>Memiliki motor/mobil pribadi dalam kondisi prima dan ber-STNK hidup.</li>
            <li>Smartphone Android/iOS dengan aplikasi WhatsApp aktif.</li>
            <li>Berkomitmen menjaga etika berkendara santun dan higienitas kendaraan.</li>
          </ul>

          <button className="btn-primary btn-apply-mitra" onClick={handleApplyWhatsApp}>
            <Send size={18} />
            <span>Daftar via WhatsApp Admin Sekarang</span>
          </button>
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
          color: var(--secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .modal-heading {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-main);
          margin-top: 2px;
        }

        .btn-close-modal {
          background: #F1EFF5;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-muted);
          transition: var(--transition);
        }

        .btn-close-modal:hover {
          background: #E5E1EC;
          color: var(--text-main);
        }

        .banner-sisterhood {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: var(--primary-light);
          border: 1px solid rgba(225, 91, 136, 0.2);
          border-radius: var(--radius-md);
          padding: 12px 14px;
          margin-bottom: 16px;
          font-size: 12px;
        }

        .banner-sisterhood strong {
          color: var(--primary);
          display: block;
          margin-bottom: 2px;
        }

        .banner-sisterhood p {
          color: var(--text-muted);
          line-height: 1.4;
        }

        .section-subheading {
          font-size: 13px;
          font-weight: 800;
          color: var(--text-main);
          margin: 14px 0 8px 0;
        }

        .benefits-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .benefit-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .check-icon {
          color: var(--accent-green);
          margin-top: 2px;
          flex-shrink: 0;
        }

        .benefit-item strong {
          font-size: 13px;
          color: var(--text-main);
          display: block;
        }

        .benefit-item p {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.35;
        }

        .requirements-list {
          padding-left: 20px;
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.6;
          margin-bottom: 20px;
        }

        .btn-apply-mitra {
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
}
