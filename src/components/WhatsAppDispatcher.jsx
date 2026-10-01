import React, { useState } from 'react';
import { Send, Copy, Check, MessageSquare, ShieldAlert, Sparkles, User, FileText, Phone } from 'lucide-react';
import { ADMINS } from '../data/admins.js';
import { formatBookingMessage, buildWhatsAppLink, openWhatsApp } from '../utils/whatsappTemplate.js';

export default function WhatsAppDispatcher({
  serviceType,
  vehicleType,
  pickup,
  dropoff,
  distanceKm,
  fareBreakdown,
  selectedDriver,
  packageCategory,
  weightCategory
}) {
  const [customerName, setCustomerName] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState('admin-1');
  const [isCopied, setIsCopied] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Selected Admin Object
  const currentAdmin = ADMINS.find((a) => a.id === selectedAdminId) || ADMINS[0];

  // Build package details label
  const packageDetailText = serviceType === 'send'
    ? `${packageCategory.toUpperCase()} (${weightCategory === 'light' ? '<2 kg' : weightCategory === 'medium' ? '2-5 kg' : '5-10 kg'})`
    : '';

  // Formatted booking text
  const bookingMessage = formatBookingMessage({
    serviceType,
    vehicleType,
    pickupAddress: pickup?.address || pickup?.name || 'Titik Jemput di Peta',
    dropoffAddress: dropoff?.address || dropoff?.name || 'Titik Tujuan di Peta',
    distanceKm,
    formattedFare: fareBreakdown?.formattedTotal || 'Rp 0',
    customerName: customerName || 'Pelanggan Perempuan',
    customerNotes,
    driverName: selectedDriver?.name || 'Acak (Dicarikan Admin)',
    packageDetails: packageDetailText
  });

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(bookingMessage);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const waUrl = buildWhatsAppLink(currentAdmin.phone, bookingMessage);
    openWhatsApp(waUrl);
  };

  return (
    <div className="whatsapp-dispatcher-card">
      {/* Admin Load Balancer Selector */}
      <div className="admin-selector-section">
        <div className="admin-section-header">
          <span className="admin-title">Pilih Dispatcher WhatsApp Admin:</span>
          <span className="live-status-tag">🟢 {ADMINS.length} Admin Siap</span>
        </div>

        <div className="admins-grid">
          {ADMINS.map((admin) => {
            const isSelected = admin.id === selectedAdminId;
            return (
              <div
                key={admin.id}
                className={`admin-card ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedAdminId(admin.id)}
              >
                <div className="admin-avatar">{admin.avatar}</div>
                <div className="admin-info">
                  <div className="admin-name-row">
                    <span className="admin-name">{admin.name}</span>
                    <span className="admin-badge">{admin.badge}</span>
                  </div>
                  <div className="admin-role">{admin.role}</div>
                  <div className="admin-phone">{admin.displayPhone}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Customer Form */}
      <div className="customer-form-section">
        <div className="form-group">
          <label className="form-label">
            <User size={13} />
            <span>Nama Anda (Pelanggan Perempuan):</span>
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="Contoh: Anisa / Rara"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <FileText size={13} />
            <span>Catatan untuk Driver / Paket:</span>
          </label>
          <textarea
            className="form-textarea"
            rows="2"
            placeholder="Contoh: Tunggu di depan minimarket dekat satpam / Barang pecah belah"
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Booking Action Buttons */}
      <div className="action-buttons-group">
        <button
          className="btn-primary btn-book-wa"
          onClick={handleOpenWhatsApp}
          id="btn-pesan-whatsapp"
        >
          <Send size={18} />
          <span>Pesan via WhatsApp ({currentAdmin.name})</span>
        </button>

        <div className="secondary-buttons-row">
          <button className="btn-secondary btn-copy" onClick={handleCopyMessage}>
            {isCopied ? <Check size={14} color="var(--primary)" /> : <Copy size={14} />}
            <span>{isCopied ? 'Tersalin!' : 'Salin Format Pesan'}</span>
          </button>

          <button
            className="btn-secondary btn-preview"
            onClick={() => setIsPreviewOpen(!isPreviewOpen)}
          >
            <MessageSquare size={14} />
            <span>{isPreviewOpen ? 'Tutup Preview' : 'Lihat Teks WA'}</span>
          </button>
        </div>
      </div>

      {/* Message Preview Modal / Box */}
      {isPreviewOpen && (
        <div className="message-preview-box">
          <div className="preview-title">Template Pesan WhatsApp Otomatis:</div>
          <pre className="preview-text">{bookingMessage}</pre>
        </div>
      )}

      {/* Sisterhood Guarantee Note */}
      <div className="sisterhood-guarantee-footer">
        <ShieldAlert size={14} className="shield-icon" />
        <span>
          Nomor Anda terlindungi dan hanya dibagikan ke driver perempuan yang bertugas.
        </span>
      </div>

      <style>{`
        .whatsapp-dispatcher-card {
          background: white;
          border-radius: var(--radius-lg);
          margin-top: 10px;
        }

        .admin-selector-section {
          margin-bottom: 14px;
        }

        .admin-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .admin-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .live-status-tag {
          font-size: 11px;
          font-weight: 700;
          color: #1B8A5A;
        }

        .admins-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: auto auto;
          gap: 8px;
        }

        .admin-card {
          border: 1.5px solid var(--border-neutral);
          border-radius: var(--radius-md);
          padding: 8px 10px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          cursor: pointer;
          transition: var(--transition);
          background: #FAFAFD;
        }

        .admin-card:hover {
          border-color: var(--primary);
        }

        .admin-card.active {
          border-color: var(--primary);
          background: var(--primary-light);
          box-shadow: 0 2px 8px var(--primary-glow);
        }

        .admin-avatar {
          font-size: 22px;
        }

        .admin-info {
          flex: 1;
        }

        .admin-name-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 4px;
        }

        .admin-name {
          font-size: 12px;
          font-weight: 800;
          color: var(--text-main);
        }

        .admin-badge {
          font-size: 9px;
          font-weight: 700;
          background: var(--primary-light);
          color: var(--primary);
          padding: 1px 5px;
          border-radius: 99px;
          white-space: nowrap;
        }

        .admin-role {
          font-size: 10px;
          color: var(--text-muted);
          line-height: 1.2;
          margin: 2px 0;
        }

        .admin-phone {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-main);
        }

        .customer-form-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .form-label {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
        }

        .form-input, .form-textarea {
          width: 100%;
          border: 1px solid var(--border-neutral);
          border-radius: var(--radius-sm);
          padding: 8px 10px;
          font-size: 13px;
          color: var(--text-main);
          background: #FAF9FB;
          outline: none;
          transition: var(--transition);
        }

        .form-input:focus, .form-textarea:focus {
          border-color: var(--primary);
          background: white;
          box-shadow: 0 0 0 2px var(--primary-light);
        }

        .form-textarea {
          resize: none;
        }

        .action-buttons-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .btn-book-wa {
          font-size: 15px;
          padding: 14px;
        }

        .secondary-buttons-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .btn-copy, .btn-preview {
          justify-content: center;
          padding: 8px;
          font-size: 12px;
        }

        .message-preview-box {
          margin-top: 12px;
          padding: 12px;
          background: #201E25;
          color: #F0EDF5;
          border-radius: var(--radius-md);
          font-size: 11px;
          animation: fadeIn 0.2s ease-out;
        }

        .preview-title {
          font-weight: 700;
          color: #FF9A76;
          margin-bottom: 6px;
        }

        .preview-text {
          white-space: pre-wrap;
          font-family: inherit;
          line-height: 1.4;
          color: #D6D2E0;
        }

        .sisterhood-guarantee-footer {
          margin-top: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-muted);
          background: #FDF4F7;
          border: 1px solid rgba(225, 91, 136, 0.15);
          padding: 8px 12px;
          border-radius: var(--radius-sm);
        }

        .shield-icon {
          color: var(--primary);
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
