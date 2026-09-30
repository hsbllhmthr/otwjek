import React, { useState } from 'react';
import {
  X,
  Send,
  MessageCircle,
  Copy,
  Check,
  ShieldCheck,
  Shuffle,
  Users,
  CreditCard,
  MapPin,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { ADMINS } from '../data/admins.js';
import { formatBookingMessage, buildWhatsAppLink } from '../utils/whatsappTemplate.js';
import { formatRupiah } from '../utils/fareCalculator.js';

export default function AdminDispatchModal({
  isOpen,
  onClose,
  bookingData = {}
}) {
  if (!isOpen) return null;

  const [customerName, setCustomerName] = useState(bookingData.customerName || 'Pelanggan SheRide');
  const [customerNotes, setCustomerNotes] = useState(bookingData.driverNotes || bookingData.packageData?.specialNotes || '');
  const [isCopied, setIsCopied] = useState(false);
  const [lastDispatchedAdmin, setLastDispatchedAdmin] = useState(null);

  const {
    serviceType = 'ride',
    vehicleType = 'motor',
    ride = {},
    pickup = {},
    dropoff = {},
    distanceKm = 0,
    paymentMethod = 'cash',
    selectedDriver = null,
    packageData = null
  } = bookingData;

  const formattedFare = ride.price ? formatRupiah(ride.price) : 'Rp 0';
  const pickupAddress = pickup?.name || pickup?.address || 'Titik Jemput di Peta';
  const dropoffAddress = dropoff?.name || dropoff?.address || 'Titik Tujuan di Peta';

  // Build booking message
  const getBookingMessage = () => {
    return formatBookingMessage({
      serviceType,
      vehicleType: ride.id?.includes('car') ? 'mobil' : 'motor',
      pickupAddress,
      dropoffAddress,
      distanceKm,
      formattedFare,
      customerName,
      customerNotes,
      driverName: selectedDriver?.name || 'Acak (Dicarikan Admin)',
      packageDetails: serviceType === 'send' ? (packageData?.itemName || 'Paket / Makanan') : '',
      packageInfo: serviceType === 'send' ? packageData : null,
      paymentMethod
    });
  };

  // 1. Direct Chat to Specific Admin
  const handleChatSpecificAdmin = (admin) => {
    const msg = getBookingMessage();
    const url = buildWhatsAppLink(admin.phone, msg);
    window.open(url, '_blank', 'noopener,noreferrer');
    setLastDispatchedAdmin(admin.name);
    setTimeout(() => onClose(), 1200);
  };

  // 2. Auto Round-Robin Dispatcher (Rotasi Beban 4 Admin Merata)
  const handleAutoDispatch = () => {
    const savedIdx = parseInt(localStorage.getItem('last_admin_dispatch_index') || '-1', 10);
    const nextIdx = (savedIdx + 1) % ADMINS.length;
    localStorage.setItem('last_admin_dispatch_index', nextIdx.toString());

    const chosenAdmin = ADMINS[nextIdx];
    handleChatSpecificAdmin(chosenAdmin);
  };

  // 3. Broadcast to All 4 Admins Simultaneously
  const handleBroadcastAll = () => {
    const msg = getBookingMessage();
    ADMINS.forEach((admin, idx) => {
      setTimeout(() => {
        const url = buildWhatsAppLink(admin.phone, msg);
        window.open(url, '_blank', 'noopener,noreferrer');
      }, idx * 400);
    });
    setLastDispatchedAdmin('Semua 4 Admin');
    setTimeout(() => onClose(), 1800);
  };

  // Copy booking text
  const handleCopyMessage = () => {
    const msg = getBookingMessage();
    navigator.clipboard.writeText(msg);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Next round-robin preview
  const currentIdx = parseInt(localStorage.getItem('last_admin_dispatch_index') || '-1', 10);
  const nextAdmin = ADMINS[(currentIdx + 1) % ADMINS.length];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-card admin-dispatch-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 490, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Modal Header */}
        <div className="modal-header-row">
          <div>
            <div className="modal-badge-pink">
              <Users size={12} />
              <span>4 Admin Dispatcher Siap</span>
            </div>
            <h3 className="modal-heading-title">Hubungi Admin WhatsApp</h3>
          </div>
          <button className="modal-btn-close" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        {/* Order Summary Pill Card */}
        <div className="order-summary-card">
          <div className="summary-top-row">
            <div className="service-info-badge">
              <span className="service-icon">{serviceType === 'send' ? '📦' : ride.id?.includes('car') ? '🚗' : '🛵'}</span>
              <span className="service-name">{ride.name || (serviceType === 'send' ? 'SheSend' : 'SheRide')}</span>
            </div>
            <div className="fare-badge">{formattedFare}</div>
          </div>

          <div className="payment-indicator-row">
            <div className={`payment-pill ${paymentMethod === 'qris' ? 'payment-pill-qris' : 'payment-pill-cash'}`}>
              <CreditCard size={13} />
              <span>Metode: {paymentMethod === 'qris' ? 'QRIS (Scan Barcode)' : 'Tunai / Cash'}</span>
            </div>
            <span className="distance-text">Jarak: {distanceKm} km</span>
          </div>

          <div className="route-preview-row">
            <div className="route-point">
              <span className="point-dot pickup-dot" />
              <span className="point-text">{pickupAddress}</span>
            </div>
            <div className="route-point">
              <span className="point-dot dropoff-dot" />
              <span className="point-text">{dropoffAddress}</span>
            </div>
          </div>
        </div>

        {/* Quick Dispatch Action Buttons */}
        <div className="quick-actions-box">
          <button
            type="button"
            className="btn-quick-auto-dispatch"
            onClick={handleAutoDispatch}
          >
            <div className="quick-action-left">
              <Shuffle size={17} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, fontSize: 13 }}>Kirim Otomatis (Rotasi 4 Admin)</div>
                <div style={{ fontSize: 10, opacity: 0.9 }}>
                  Giliran berikutnya: <strong>{nextAdmin.name}</strong> ({nextAdmin.role})
                </div>
              </div>
            </div>
            <ChevronRight size={16} />
          </button>

          <button
            type="button"
            className="btn-quick-broadcast"
            onClick={handleBroadcastAll}
            title="Membuka chat ke semua 4 admin secara berurutan"
          >
            <MessageCircle size={15} color="#25D366" />
            <span>Hubungi Semua 4 Admin Sekaligus (Broadcast)</span>
          </button>
        </div>

        {/* 4 Admin Cards Grid */}
        <div className="admin-list-section">
          <div className="admin-list-header">
            <span>Atau Pilih Salah Satu Admin Langsung:</span>
          </div>

          <div className="admin-grid-4">
            {ADMINS.map((admin) => (
              <div
                key={admin.id}
                className="admin-card-item"
                onClick={() => handleChatSpecificAdmin(admin)}
              >
                <div className="admin-card-top">
                  <div className="admin-avatar-box">{admin.avatar}</div>
                  <div className="admin-text-meta">
                    <div className="admin-name-badge">
                      <span className="admin-name">{admin.name}</span>
                      <span className="admin-tag-chip">{admin.badge}</span>
                    </div>
                    <div className="admin-role-desc">{admin.role}</div>
                    <div className="admin-phone-num">{admin.displayPhone}</div>
                  </div>
                </div>

                <div className="admin-card-action">
                  <span className="admin-status-online">🟢 Online</span>
                  <button
                    type="button"
                    className="btn-chat-admin-single"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChatSpecificAdmin(admin);
                    }}
                  >
                    <Send size={12} />
                    <span>Chat WA</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Copy & Status Toast Footer */}
        <div className="modal-bottom-utility">
          <button
            type="button"
            className="btn-copy-format"
            onClick={handleCopyMessage}
          >
            {isCopied ? <Check size={13} color="#FF337F" /> : <Copy size={13} />}
            <span>{isCopied ? 'Teks Pesan Berhasil Disalin!' : 'Salin Format Pesan Booking'}</span>
          </button>

          {lastDispatchedAdmin && (
            <div className="dispatch-success-banner">
              ✅ Membuka WhatsApp ke: <strong>{lastDispatchedAdmin}</strong>
            </div>
          )}

          <div className="sisterhood-protection-note">
            <ShieldCheck size={14} color="#FF337F" style={{ flexShrink: 0 }} />
            <span>
              Privasi Aman: Pesanan hanya diteruskan ke nomor admin resmi SheRide & pengemudi wanita terverifikasi.
            </span>
          </div>
        </div>

        <style>{`
          .admin-dispatch-modal {
            padding: 18px 20px;
            background: #FFFFFF;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
            font-family: inherit;
          }

          .modal-header-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 12px;
          }

          .modal-badge-pink {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background: rgba(255, 51, 127, 0.1);
            color: #FF337F;
            font-size: 11px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 99px;
            margin-bottom: 4px;
          }

          .modal-heading-title {
            font-size: 18px;
            font-weight: 800;
            color: #111827;
            margin: 0;
          }

          .modal-btn-close {
            background: #F3F4F6;
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #4B5563;
            transition: all 0.2s;
          }

          .modal-btn-close:hover {
            background: #E5E7EB;
            color: #111827;
          }

          .order-summary-card {
            background: #FDF4F7;
            border: 1px solid rgba(255, 51, 127, 0.2);
            border-radius: 12px;
            padding: 12px 14px;
            margin-bottom: 12px;
          }

          .summary-top-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
          }

          .service-info-badge {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .service-icon {
            font-size: 16px;
          }

          .service-name {
            font-size: 14px;
            font-weight: 800;
            color: #111827;
          }

          .fare-badge {
            font-size: 15px;
            font-weight: 800;
            color: #FF337F;
          }

          .payment-indicator-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 11px;
          }

          .payment-pill {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 3px 8px;
            border-radius: 6px;
            font-weight: 700;
          }

          .payment-pill-cash {
            background: #EBF7EE;
            color: #15803D;
          }

          .payment-pill-qris {
            background: #EDE9FE;
            color: #7C3AED;
          }

          .distance-text {
            color: #6B7280;
            font-weight: 600;
          }

          .route-preview-row {
            display: flex;
            flex-direction: column;
            gap: 4px;
            border-top: 1px dashed rgba(255, 51, 127, 0.2);
            padding-top: 8px;
          }

          .route-point {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
          }

          .point-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            flex-shrink: 0;
          }

          .pickup-dot {
            background: #FF337F;
          }

          .dropoff-dot {
            background: #111827;
          }

          .point-text {
            color: #374151;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .quick-actions-box {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 14px;
          }

          .btn-quick-auto-dispatch {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: linear-gradient(135deg, #FF337F 0%, #FF5C9D 100%);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 10px 14px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(255, 51, 127, 0.3);
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          }

          .btn-quick-auto-dispatch:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(255, 51, 127, 0.4);
          }

          .quick-action-left {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .btn-quick-broadcast {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: #F0FDF4;
            color: #166534;
            border: 1px solid #BBF7D0;
            border-radius: 10px;
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.15s;
          }

          .btn-quick-broadcast:hover {
            background: #DCFCE7;
            border-color: #86EFAC;
          }

          .admin-list-section {
            margin-bottom: 12px;
          }

          .admin-list-header {
            font-size: 11px;
            font-weight: 700;
            color: #6B7280;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 8px;
          }

          .admin-grid-4 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          @media (max-width: 440px) {
            .admin-grid-4 {
              grid-template-columns: 1fr;
            }
          }

          .admin-card-item {
            background: #FAFAFB;
            border: 1px solid #E5E7EB;
            border-radius: 12px;
            padding: 10px;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 8px;
            transition: all 0.2s;
          }

          .admin-card-item:hover {
            border-color: #FF337F;
            background: #FFF5F9;
            transform: translateY(-1px);
            box-shadow: 0 4px 10px rgba(255, 51, 127, 0.1);
          }

          .admin-card-top {
            display: flex;
            align-items: flex-start;
            gap: 8px;
          }

          .admin-avatar-box {
            font-size: 20px;
            line-height: 1;
            padding-top: 2px;
          }

          .admin-text-meta {
            flex: 1;
            min-width: 0;
          }

          .admin-name-badge {
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .admin-name {
            font-size: 12px;
            font-weight: 800;
            color: #111827;
          }

          .admin-tag-chip {
            font-size: 8px;
            font-weight: 700;
            background: rgba(255, 51, 127, 0.1);
            color: #FF337F;
            padding: 1px 4px;
            border-radius: 4px;
          }

          .admin-role-desc {
            font-size: 10px;
            color: #6B7280;
            line-height: 1.2;
            margin: 2px 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .admin-phone-num {
            font-size: 10px;
            font-weight: 700;
            color: #1F2937;
          }

          .admin-card-action {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 6px;
            border-top: 1px solid #F3F4F6;
          }

          .admin-status-online {
            font-size: 9px;
            font-weight: 700;
            color: #15803D;
          }

          .btn-chat-admin-single {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: #25D366;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 4px 8px;
            font-size: 10px;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.15s;
          }

          .btn-chat-admin-single:hover {
            background: #1EBE5D;
          }

          .modal-bottom-utility {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding-top: 8px;
          }

          .btn-copy-format {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            background: #F9FAFB;
            border: 1px dashed #D1D5DB;
            color: #4B5563;
            border-radius: 8px;
            padding: 7px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s;
          }

          .btn-copy-format:hover {
            border-color: #FF337F;
            color: #FF337F;
          }

          .dispatch-success-banner {
            background: #EFF6FF;
            color: #1D4ED8;
            font-size: 11px;
            padding: 6px 10px;
            border-radius: 6px;
            text-align: center;
          }

          .sisterhood-protection-note {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 10px;
            color: #6B7280;
            background: #FDF4F7;
            padding: 6px 10px;
            border-radius: 8px;
            line-height: 1.3;
          }
        `}</style>
      </div>
    </div>
  );
}
