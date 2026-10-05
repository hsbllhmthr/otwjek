import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MoreVertical,
  Info,
  CheckCircle2,
  Copy,
  Check,
  Clock,
  Package,
  MapPin,
  ShieldCheck,
  Share2,
  FileText
} from 'lucide-react';
import { formatRupiah, PRICING_CONFIG } from '../utils/fareCalculator.js';
import { buildWhatsAppLink, formatBookingMessage, openWhatsApp } from '../utils/whatsappTemplate.js';
import { ADMINS } from '../data/admins.js';
import dbService from '../services/dbService.js';

export default function PackageDetailsPage({
  pickup,
  dropoff,
  senderInfo = null,
  recipientInfo = { name: '', phone: '', floorUnit: '', noteToDriver: '' },
  itemInfo = { itemName: '', category: 'Food', size: 'S', weight: '1', weightTier: 'light', guarantee: '1 Basic' },
  selectedVehicle = 'bike',
  deliverySpeed = 'instant',
  fare = 30500,
  distanceKm = 4.5,
  paymentMethod = 'cash',
  selectedAdmin: initialAdmin = null,
  onBack,
  onCancelDelivery
}) {
  const [copiedField, setCopiedField] = useState(null);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [selectedAdminId, setSelectedAdminId] = useState(initialAdmin?.id || ADMINS[0]?.id || 'admin-1');
  const selectedAdmin = ADMINS.find((a) => a.id === selectedAdminId) || initialAdmin || ADMINS[0];

  const sessionUser = dbService?.session?.getCurrentUser();
  const effectiveSenderName =
    senderInfo?.name && senderInfo.name !== 'Hasbullah' && senderInfo.name !== 'Pengirim OTWJek'
      ? senderInfo.name
      : (sessionUser?.fullName || sessionUser?.full_name || sessionUser?.name || senderInfo?.name || 'Pengirim OTWJek');
  const effectiveSenderPhone =
    senderInfo?.phone && senderInfo.phone !== '+6288705806690'
      ? senderInfo.phone
      : (sessionUser?.phone || senderInfo?.phone || '+6288705806690');

  // Background geolocation fetching (doesn't block button click)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (pos?.coords?.latitude && pos?.coords?.longitude) {
            setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 3000, maximumAge: 30000 }
      );
    }
  }, []);

  // Dynamic Transaction & Booking IDs
  const [transactionId] = useState(() => 'TRX' + Math.floor(1000000000 + Math.random() * 9000000000));
  const [bookingId] = useState(() => 'BKG' + Math.floor(100000 + Math.random() * 900000));

  // Current dynamic date & time
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const timeFormatted = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const scheduleDateFormatted = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  }) + ` - ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;

  const currentPrice = fare || 30500;
  const platformFee = PRICING_CONFIG.platformFee || 2000;
  const baseTripFare = Math.max(0, currentPrice - platformFee);
  const originalPrice = Math.round((currentPrice + 4000) / 1000) * 1000;
  const discountAmount = Math.max(0, originalPrice - currentPrice);

  const isCar = selectedVehicle === 'car';
  const vehicleName = isCar
    ? `SheSend Car Cargo${deliverySpeed === 'hemat' ? ' (Hemat)' : ''}`
    : `SheSend Instant Bike${deliverySpeed === 'hemat' ? ' (Hemat)' : ''}`;

  const etaLabel = deliverySpeed === 'hemat' ? '2-3 hours' : '30-45 mins';
  const weightTierLabels = {
    light: 'Ringan (< 2 kg)',
    medium: 'Sedang (2 - 5 kg)',
    heavy: 'Berat (5 - 10 kg)'
  };
  const weightText = weightTierLabels[itemInfo?.weightTier] || `${itemInfo?.weight || '1'} kg`;

  const dimensions = {
    S: '20 x 40 x 40 cm',
    M: '30 x 50 x 50 cm',
    L: '40 x 70 x 70 cm'
  }[itemInfo?.size || 'S'] || '20 x 40 x 40 cm';

  const pickupTitle = pickup?.name || pickup?.address || 'Titik Jemput Pengirim';
  const dropoffTitle = dropoff?.name || dropoff?.address || 'Titik Tujuan Penerima';

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleShareToWhatsApp = () => {
    const shareLat = gpsCoords?.lat || pickup?.lat;
    const shareLng = gpsCoords?.lng || pickup?.lng;

    const BOOK_NOW_PHONE = selectedAdmin?.phone || '62882021942470';

    const message = formatBookingMessage({
      serviceType: 'send',
      vehicleType: isCar ? 'mobil' : 'motor',
      pickupAddress: pickupTitle,
      dropoffAddress: dropoffTitle,
      distanceKm,
      formattedFare: formatRupiah(currentPrice),
      customerName: effectiveSenderName,
      customerPhone: effectiveSenderPhone,
      customerNotes: recipientInfo?.noteToDriver || '',
      driverName: 'Acak (Dicarikan Admin)',
      packageDetails: `${itemInfo?.itemName || 'Barang'} [${itemInfo?.category || 'Umum'}, ${itemInfo?.weight || '1'}kg]`,
      packageInfo: {
        itemName: itemInfo?.itemName || 'Paket / Makanan',
        weightTier: itemInfo?.weightTier || 'light',
        category: itemInfo?.category || 'Food',
        size: itemInfo?.size || 'S',
        recipientName: recipientInfo?.name || 'Penerima',
        recipientPhone: recipientInfo?.phone || '',
        senderPhone: effectiveSenderPhone,
        specialNotes: recipientInfo?.noteToDriver || ''
      },
      paymentMethod,
      pickupCoords: shareLat && shareLng ? { lat: shareLat, lng: shareLng } : null,
      dropoffCoords: dropoff?.lat && dropoff?.lng ? { lat: dropoff.lat, lng: dropoff.lng } : null
    });

    const url = buildWhatsAppLink(BOOK_NOW_PHONE, message);
    openWhatsApp(url);
  };

  return (
    <div className="ride-details-viewport">
      {/* Top Header */}
      <header className="ride-details-header">
        <button
          type="button"
          className="btn-header-back"
          onClick={onBack}
          aria-label="Back"
        >
          <ArrowLeft size={21} color="#1C1C1E" />
        </button>

        <h1 className="header-title">Delivery Details</h1>

        <button
          type="button"
          className="btn-header-more"
          onClick={handleShareToWhatsApp}
          title="Share to WhatsApp"
        >
          <MoreVertical size={20} color="#1C1C1E" />
        </button>
      </header>

      {/* Main Content */}
      <div className="ride-details-content">
        {/* Card 1: Your Scheduled Delivery */}
        <section className="details-card card-schedule">
          <h2 className="schedule-title">Your Scheduled Delivery</h2>
          <div className="schedule-subtitle">{scheduleDateFormatted}</div>

          <div className="notify-banner">
            <div className="notify-icon-circle">
              <Info size={14} color="#00B14F" />
            </div>
            <span>We'll notify you when a courier's found</span>
          </div>
        </section>

        {/* Card 2: Vehicle & Delivery Info */}
        <section className="details-card card-vehicle">
          <div className="vehicle-left-col">
            <div className="vehicle-icon-frame">
              {isCar ? (
                /* Car Cargo Icon */
                <svg width="42" height="28" viewBox="0 0 54 36" fill="none">
                  <path d="M10 23L14.5 12C15.5 9.5 18 8 21 8H33C36 8 38.5 9.5 39.5 12L44 23H48C49.7 23 51 24.3 51 26V29C51 29.6 50.6 30 50 30H4V30C3.4 30 3 29.6 3 29V26C3 24.3 4.3 23 6 23H10Z" fill="#00C058" />
                  <path d="M22 4H32V8H22V4Z" fill="#008A3E" rx="1.5" />
                  <path d="M16 13H38L41 21H13L16 13Z" fill="#E6FAF0" />
                  <circle cx="13" cy="30" r="5" fill="#2E3338" />
                  <circle cx="13" cy="30" r="2" fill="#E5E7EB" />
                  <circle cx="41" cy="30" r="5" fill="#2E3338" />
                  <circle cx="41" cy="30" r="2" fill="#E5E7EB" />
                </svg>
              ) : (
                /* Bike Courier Icon */
                <svg width="38" height="28" viewBox="0 0 48 36" fill="none">
                  <circle cx="11" cy="27" r="7" stroke="#2E3338" strokeWidth="3" fill="#FFFFFF" />
                  <circle cx="37" cy="27" r="7" stroke="#2E3338" strokeWidth="3" fill="#FFFFFF" />
                  <path d="M11 27H23L27 16H36" stroke="#00C058" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M33 11L37 16L34 27" stroke="#00C058" strokeWidth="3" strokeLinecap="round" />
                  {/* Delivery Box mounted on bike */}
                  <rect x="14" y="9" width="11" height="9" rx="1.5" fill="#F472B6" stroke="#EC4899" strokeWidth="1.2" />
                </svg>
              )}
            </div>

            <div className="vehicle-details">
              <div className="vehicle-title">{vehicleName}</div>
              <div className="vehicle-meta">
                <span className="meta-text">
                  <Clock size={11} className="meta-icon" />
                  <span>{etaLabel}</span>
                </span>
                <span className="meta-separator">·</span>
                <span className="meta-text">
                  <Package size={11} className="meta-icon" />
                  <span>{weightText}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="vehicle-right-col">
            <div className="fare-badge-box">
              <CheckCircle2 size={14} color="#00B14F" className="fare-check-icon" />
              <span className="fare-amount">{formatRupiah(currentPrice)}</span>
            </div>
            {discountAmount > 0 && (
              <span className="fare-strikethrough">{formatRupiah(originalPrice)}</span>
            )}
          </div>
        </section>

        {/* Card 3: Route Locations (Pengirim & Penerima) */}
        <section className="details-card card-route">
          <div className="route-layout">
            {/* Left Track Indicator */}
            <div className="route-track-column">
              <div className="pin-pickup-wrapper">
                <div className="pin-pickup-outer">
                  <div className="pin-pickup-inner" />
                </div>
              </div>

              <div className="route-dots-stem">
                <span className="dot-step" />
                <span className="dot-step" />
                <span className="dot-step" />
                <span className="dot-step" />
              </div>

              <div className="pin-dropoff-wrapper">
                <svg width="18" height="22" viewBox="0 0 20 24" fill="none">
                  <path d="M10 0C4.48 0 0 4.48 0 10C0 17.5 10 24 10 24C10 24 20 17.5 20 10C20 4.48 15.52 0 10 0Z" fill="#EF4444" />
                  <circle cx="10" cy="9.5" r="4" fill="#FFFFFF" />
                </svg>
              </div>
            </div>

            {/* Right Location Names & Contacts */}
            <div className="route-names-column">
              <div className="route-row-item pickup-row" style={{ height: 'auto', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div className="location-heading">{pickupTitle}</div>
                <div style={{ fontSize: '11.5px', color: '#6E7191', marginTop: '2px' }}>
                  Pengirim: <strong style={{ color: '#111827' }}>{effectiveSenderName}</strong> ({effectiveSenderPhone})
                </div>
              </div>

              <div className="route-horizontal-divider" />

              <div className="route-row-item dropoff-row" style={{ height: 'auto', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div className="location-heading">{dropoffTitle}</div>
                <div style={{ fontSize: '11.5px', color: '#6E7191', marginTop: '2px' }}>
                  Penerima: <strong style={{ color: '#111827' }}>{recipientInfo?.name || 'Penerima'}</strong> ({recipientInfo?.phone || '-'})
                  {recipientInfo?.floorUnit ? ` • Unit: ${recipientInfo.floorUnit}` : ''}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Card 4: Item & Package Details (Special for Package Flow) */}
        <section className="details-card card-table">
          <div style={{ marginBottom: '4px', borderBottom: '1px solid #F0F1F3', paddingBottom: '10px' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: '750', color: '#111827', margin: 0 }}>
              Detail Barang Kiriman
            </h3>
          </div>

          <div className="table-row">
            <span className="table-label">Nama Barang</span>
            <span className="table-value" style={{ fontWeight: '700' }}>
              {itemInfo?.itemName || 'Paket / Makanan'}
            </span>
          </div>

          <div className="table-row">
            <span className="table-label">Kategori Barang</span>
            <span className="table-value">
              <span style={{ background: '#F3F4F6', padding: '2px 8px', borderRadius: '6px', fontSize: '12px' }}>
                {itemInfo?.category || 'Food'}
              </span>
            </span>
          </div>

          <div className="table-row">
            <span className="table-label">Berat Barang</span>
            <span className="table-value">
              {itemInfo?.weight || '1'} kg ({weightTierLabels[itemInfo?.weightTier] || 'Ringan'})
            </span>
          </div>

          <div className="table-row">
            <span className="table-label">Ukuran Box</span>
            <span className="table-value">
              Ukuran {itemInfo?.size || 'S'} ({dimensions})
            </span>
          </div>

          <div className="table-row">
            <span className="table-label">Perlindungan / Garansi</span>
            <span className="table-value" style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} color="#059669" />
              <span>{itemInfo?.guarantee || 'Basic Protection (Rp1.000.000)'}</span>
            </span>
          </div>

          {itemInfo?.photo && (
            <div className="table-row" style={{ alignItems: 'flex-start', paddingTop: '4px' }}>
              <span className="table-label">Foto Paket</span>
              <img
                src={itemInfo.photo}
                alt="Foto paket"
                style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #E5E7EB' }}
              />
            </div>
          )}
        </section>

        {/* Card 4b: Note to Driver (conditional) */}
        {recipientInfo?.noteToDriver && recipientInfo.noteToDriver.trim() !== '' && (
          <section className="details-card card-notes">
            <div className="notes-label">Instruksi Khusus untuk Kurir</div>
            <div className="notes-text">{recipientInfo.noteToDriver.trim()}</div>
          </section>
        )}

        {/* Card 5: Metadata Table */}
        <section className="details-card card-table">
          <div className="table-row">
            <span className="table-label">Status</span>
            <span className="status-badge-scheduled">
              Scheduled (Siap Dijemput)
            </span>
          </div>

          <div className="table-row">
            <span className="table-label">Payment</span>
            <span className="table-value">
              {paymentMethod === 'qris' ? 'QRIS SheSend' : 'SheSend Cash (Tunai)'}
            </span>
          </div>

          <div className="table-row">
            <span className="table-label">Date</span>
            <span className="table-value">{dateFormatted}</span>
          </div>

          <div className="table-row">
            <span className="table-label">Time</span>
            <span className="table-value">{timeFormatted}</span>
          </div>

          <div className="table-row">
            <span className="table-label">Transaction ID</span>
            <button
              type="button"
              className="btn-copy-code"
              onClick={() => handleCopy(transactionId, 'trx')}
              title="Copy Transaction ID"
            >
              <span className="code-text">{transactionId}</span>
              {copiedField === 'trx' ? (
                <Check size={13} color="#00B14F" />
              ) : (
                <Copy size={13} color="#8F90A6" />
              )}
            </button>
          </div>

          <div className="table-row">
            <span className="table-label">Booking ID</span>
            <button
              type="button"
              className="btn-copy-code"
              onClick={() => handleCopy(bookingId, 'bkg')}
              title="Copy Booking ID"
            >
              <span className="code-text">{bookingId}</span>
              {copiedField === 'bkg' ? (
                <Check size={13} color="#00B14F" />
              ) : (
                <Copy size={13} color="#8F90A6" />
              )}
            </button>
          </div>
        </section>

        {/* Card 6: Fare Breakdown */}
        <section className="details-card card-fare">
          <div className="table-row">
            <span className="table-label">Tarif Pengiriman ({distanceKm} km)</span>
            <span className="table-value">{formatRupiah(baseTripFare)}</span>
          </div>

          <div className="table-row">
            <span className="table-label">Biaya Admin Platform</span>
            <span className="table-value">{formatRupiah(platformFee)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="table-row">
              <span className="table-label">Diskon Promo OTWJEK</span>
              <span className="table-value discount-text">- {formatRupiah(discountAmount)}</span>
            </div>
          )}

          <div className="fare-break-divider" />

          <div className="table-row total-row">
            <span className="total-label">Total Pembayaran (Total Paid)</span>
            <span className="total-amount">{formatRupiah(currentPrice)}</span>
          </div>
        </section>

        {/* Card 6: WhatsApp Dispatcher Selection (4 Admins) */}
        <section className="details-card card-admin-dispatch">
          <div className="admin-section-header">
            <div>
              <h2 className="admin-section-title">Pilih Admin WhatsApp</h2>
              <div className="admin-section-subtitle">
                Pilih nomor admin untuk memproses & menugaskan kurir
              </div>
            </div>
          </div>

          <div className="admin-list-container">
            {ADMINS.map((adm) => {
              const isSelected = selectedAdminId === adm.id;
              return (
                <div
                  key={adm.id}
                  className={`admin-item-tile ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedAdminId(adm.id)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                >
                  <div className="admin-tile-left">
                    <div className={`admin-radio-circle ${isSelected ? 'active' : ''}`}>
                      {isSelected && <div className="admin-radio-inner" />}
                    </div>
                    <span className="admin-name">{adm.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom Dual Action Buttons */}
        <div className="bottom-buttons-area">
          <button
            type="button"
            className="btn-share-receipt"
            onClick={handleShareToWhatsApp}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Share2 size={18} />
              <span>Book Now via WhatsApp ({selectedAdmin.name})</span>
            </span>
          </button>

          <button
            type="button"
            className="btn-cancel-ride"
            onClick={() => {
              if (onBack) onBack();
              else if (onCancelDelivery) onCancelDelivery();
            }}
          >
            Ubah / Kembali ke Detail Paket
          </button>
        </div>
      </div>

      <style>{`
        .ride-details-viewport {
          position: absolute;
          inset: 0;
          background: #F4F5F7;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          overflow: hidden;
          letter-spacing: -0.15px;
        }

        .ride-details-header {
          height: 54px;
          background: #F4F5F7;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          flex-shrink: 0;
        }

        .header-title {
          font-size: 17.5px;
          font-weight: 700;
          color: #111827;
          margin: 0;
          text-align: center;
        }

        .btn-header-back, .btn-header-more {
          background: transparent;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #111827;
          padding: 0;
        }

        .btn-header-back:active, .btn-header-more:active {
          background: rgba(0, 0, 0, 0.05);
        }

        .ride-details-content {
          flex: 1;
          overflow-y: auto;
          padding: 10px 16px 24px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          -webkit-overflow-scrolling: touch;
        }

        .details-card {
          background: #FFFFFF;
          border-radius: 14px;
          padding: 16px;
          box-shadow: none !important;
          border: none !important;
        }

        .card-schedule {
          text-align: center;
          padding: 20px 16px 16px 16px;
        }

        .schedule-title {
          font-size: 19px;
          font-weight: 750;
          color: #111827;
          margin: 0 0 5px 0;
          letter-spacing: -0.3px;
        }

        .schedule-subtitle {
          font-size: 13.5px;
          color: #555770;
          font-weight: 450;
          margin-bottom: 14px;
        }

        .notify-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #00B14F;
          color: #FFFFFF;
          border-radius: 8px;
          padding: 11px 14px;
          font-size: 12.5px;
          font-weight: 600;
          width: 100%;
          box-sizing: border-box;
        }

        .notify-icon-circle {
          width: 17px;
          height: 17px;
          background: #FFFFFF;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .card-vehicle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
        }

        .vehicle-left-col {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .vehicle-icon-frame {
          width: 44px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .vehicle-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .vehicle-title {
          font-size: 15px;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.2px;
        }

        .vehicle-meta {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          color: #6E7191;
          font-weight: 400;
        }

        .meta-text {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }

        .meta-icon {
          color: #8F90A6;
        }

        .meta-separator {
          color: #B5B7C8;
        }

        .vehicle-right-col {
          text-align: right;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .fare-badge-box {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .fare-amount {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.2px;
        }

        .fare-strikethrough {
          font-size: 11.5px;
          color: #8F90A6;
          text-decoration: line-through;
        }

        .card-route {
          padding: 14px 16px;
        }

        .route-layout {
          display: flex;
          align-items: stretch;
          gap: 12px;
        }

        .route-track-column {
          width: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 4px 0;
          flex-shrink: 0;
        }

        .pin-pickup-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 20px;
        }

        .pin-pickup-outer {
          width: 17px;
          height: 17px;
          border-radius: 50%;
          background: #00B14F;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pin-pickup-inner {
          width: 6.5px;
          height: 6.5px;
          border-radius: 50%;
          background: #FFFFFF;
        }

        .route-dots-stem {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          margin: 4px 0;
        }

        .dot-step {
          width: 2.5px;
          height: 2.5px;
          border-radius: 50%;
          background: #D1D5DB;
        }

        .pin-dropoff-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 20px;
        }

        .route-names-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-width: 0;
        }

        .route-row-item {
          display: flex;
          align-items: center;
        }

        .location-heading {
          font-size: 14.5px;
          font-weight: 600;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3;
          letter-spacing: -0.2px;
        }

        .route-horizontal-divider {
          height: 1px;
          background: #F0F1F3;
          width: 100%;
          margin: 8px 0;
        }

        .card-notes {
          padding: 14px 16px;
        }

        .notes-label {
          font-size: 11px;
          font-weight: 600;
          color: #8F90A6;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 6px;
        }

        .notes-text {
          font-size: 13.5px;
          font-weight: 450;
          color: #374151;
          line-height: 1.5;
        }

        .card-table, .card-fare {
          display: flex;
          flex-direction: column;
          gap: 13px;
          padding: 16px;
        }

        .table-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13.5px;
        }

        .table-label {
          color: #555770;
          font-weight: 450;
        }

        .table-value {
          color: #111827;
          font-weight: 550;
        }

        .status-badge-scheduled {
          border: 1px solid #60A5FA;
          color: #2563EB;
          background: transparent;
          font-size: 11px;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .btn-copy-code {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          font-family: inherit;
        }

        .code-text {
          font-size: 13.5px;
          font-weight: 550;
          color: #111827;
        }

        .table-label-with-badge {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .admin-fee-badge {
          font-size: 10px;
          color: #FF337F;
          background: #FDF2F8;
          border: 1px solid #FBCFE8;
          padding: 1px 7px;
          border-radius: 9999px;
          width: fit-content;
        }

        .discount-text {
          color: #059669;
          font-weight: 600;
        }

        .fare-break-divider {
          height: 1px;
          background: #F0F1F3;
          margin: 2px 0;
        }

        .total-row {
          padding-top: 2px;
        }

        .total-label {
          font-size: 14.5px;
          font-weight: 700;
          color: #111827;
        }

        .total-amount {
          font-size: 15.5px;
          font-weight: 750;
          color: #111827;
        }

        .bottom-buttons-area {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 6px;
          margin-bottom: 12px;
        }

        .btn-share-receipt {
          width: 100%;
          height: 48px;
          border-radius: 999px;
          background: #FF337F;
          color: #FFFFFF;
          font-size: 15.5px;
          font-weight: 700 !important;
          letter-spacing: -0.2px;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(255, 51, 127, 0.32);
          transition: background-color 0.15s ease, transform 0.15s ease;
          font-family: inherit;
        }

        .btn-share-receipt:hover {
          background: #E11D6F;
          transform: translateY(-1px);
        }

        .btn-cancel-ride {
          width: 100%;
          height: 48px;
          border-radius: 999px;
          background: #FFFFFF;
          border: 1.5px solid #F3D2DF;
          color: #FF337F;
          font-size: 15.5px;
          font-weight: 500;
          letter-spacing: -0.2px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.15s ease;
          font-family: inherit;
        }

        .btn-cancel-ride:hover {
          background: #FFF0F5;
        }

        .btn-locating-spin {
          width: 16px;
          height: 16px;
          border: 2.2px solid rgba(255, 255, 255, 0.35);
          border-top-color: #FFFFFF;
          border-radius: 50%;
          animation: spinLocating 0.7s linear infinite;
        }

        @keyframes spinLocating {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Card 6: WhatsApp Admin Selection */
        .card-admin-dispatch {
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #FFFFFF;
          border-radius: 14px;
          padding: 16px;
        }

        .admin-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 2px;
        }

        .admin-section-title {
          font-size: 15px;
          font-weight: 700;
          color: #111827;
          margin: 0;
          letter-spacing: -0.2px;
        }

        .admin-section-subtitle {
          font-size: 11.5px;
          color: #6B7280;
          font-weight: 450;
          margin-top: 1px;
        }

        .admin-list-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .admin-item-tile {
          display: flex;
          align-items: center;
          height: 46px;
          padding: 0 14px;
          border-radius: 12px;
          border: 1.5px solid #E5E7EB;
          background: #FAFAFA;
          cursor: pointer;
          transition: all 0.15s ease;
          user-select: none;
        }

        .admin-item-tile:hover {
          background: #F3F4F6;
        }

        .admin-item-tile.selected {
          border-color: #00B14F;
          background: #F0FDF4;
        }

        .admin-tile-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .admin-radio-circle {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid #D1D5DB;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: #FFFFFF;
          transition: border-color 0.15s ease;
        }

        .admin-radio-circle.active {
          border-color: #00B14F;
        }

        .admin-radio-inner {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #00B14F;
        }

        .admin-name {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          letter-spacing: -0.1px;
        }
      `}</style>
    </div>
  );
}
