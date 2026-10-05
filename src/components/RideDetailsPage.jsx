import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MoreVertical,
  Info,
  CheckCircle2,
  Copy,
  Check,
  Clock,
  Users
} from 'lucide-react';
import { formatRupiah, PRICING_CONFIG } from '../utils/fareCalculator.js';
import { buildWhatsAppLink, formatBookingMessage, openWhatsApp } from '../utils/whatsappTemplate.js';
import { ADMINS } from '../data/admins.js';
import dbService from '../services/dbService.js';

export default function RideDetailsPage({
  pickup,
  dropoff,
  ride,
  distanceKm = 6.5,
  durationMinutes = 17,
  paymentMethod = 'cash',
  driverNotes = '',
  selectedDriver = null,
  customerName = '',
  customerPhone = '',
  currentUser = null,
  onBack,
  onCancelRide
}) {
  const [copiedField, setCopiedField] = useState(null);
  const [selectedAdminId, setSelectedAdminId] = useState(ADMINS[0]?.id || 'admin-1');
  const selectedAdmin = ADMINS.find((a) => a.id === selectedAdminId) || ADMINS[0];

  // Generate dynamic Transaction & Booking IDs
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

  const currentPrice = ride?.price || 17000;
  const platformFee = PRICING_CONFIG.platformFee || 2000;
  const baseTripFare = Math.max(0, currentPrice - platformFee);

  const hasOriginalPrice = ride?.originalPrice && ride.originalPrice > currentPrice;
  const originalPrice = hasOriginalPrice
    ? ride.originalPrice
    : (ride?.hasDiscount ? Math.round((currentPrice + 3000) / 1000) * 1000 : currentPrice);
  const discountAmount = Math.max(0, originalPrice - currentPrice);
  const displayTripFare = discountAmount > 0 ? baseTripFare + discountAmount : baseTripFare;

  const isCar = ride?.id?.includes('car') || ride?.name?.toLowerCase().includes('mobil') || ride?.name?.toLowerCase().includes('car');
  const passengerCount = isCar ? '4 passengers' : '1 passenger';
  const vehicleName = isCar ? 'SheRide Car' : 'SheRide Motor';

  const pickupTitle = pickup?.name || pickup?.address || 'Bobst Library';
  const dropoffTitle = dropoff?.name || dropoff?.address || 'Larchmont Hotel';

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const [gpsCoords, setGpsCoords] = useState(null);

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

  const handleShareToWhatsApp = () => {
    // Target selected WhatsApp Admin Dispatcher
    const BOOK_NOW_PHONE = selectedAdmin?.phone || '62882021942470';

    const shareLat = gpsCoords?.lat || pickup?.lat;
    const shareLng = gpsCoords?.lng || pickup?.lng;

    const sessionUser = currentUser || dbService?.session?.getCurrentUser();
    const resolvedCustomerName =
      customerName ||
      sessionUser?.fullName ||
      sessionUser?.full_name ||
      sessionUser?.name ||
      'Pelanggan OTWJek';
    const resolvedCustomerPhone = customerPhone || sessionUser?.phone || '';

    const message = formatBookingMessage({
      serviceType: 'ride',
      vehicleType: isCar ? 'mobil' : 'motor',
      pickupAddress: pickupTitle,
      dropoffAddress: dropoffTitle,
      distanceKm,
      formattedFare: formatRupiah(currentPrice),
      customerName: resolvedCustomerName,
      customerPhone: resolvedCustomerPhone,
      customerNotes: driverNotes || '',
      driverName: selectedDriver?.name || 'Acak (Dicarikan Admin)',
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

        <h1 className="header-title">Ride Details</h1>

        <button
          type="button"
          className="btn-header-more"
          onClick={handleShareToWhatsApp}
          title="Options"
        >
          <MoreVertical size={20} color="#1C1C1E" />
        </button>
      </header>

      {/* Main Content */}
      <div className="ride-details-content">
        {/* Card 1: Your Scheduled Ride */}
        <section className="details-card card-schedule">
          <h2 className="schedule-title">Your Scheduled Ride</h2>
          <div className="schedule-subtitle">{scheduleDateFormatted}</div>

          <div className="notify-banner">
            <div className="notify-icon-circle">
              <Info size={14} color="#00B14F" />
            </div>
            <span>We'll notify you when a driver's found</span>
          </div>
        </section>

        {/* Card 2: Vehicle & Fare Info */}
        <section className="details-card card-vehicle">
          <div className="vehicle-left-col">
            <div className="vehicle-icon-frame">
              {isCar ? (
                /* Clean Green Taxi/Car Icon matching reference */
                <svg width="42" height="28" viewBox="0 0 54 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 23L14.5 12C15.5 9.5 18 8 21 8H33C36 8 38.5 9.5 39.5 12L44 23H48C49.7 23 51 24.3 51 26V29C51 29.6 50.6 30 50 30H4V30C3.4 30 3 29.6 3 29V26C3 24.3 4.3 23 6 23H10Z" fill="#00C058" />
                  <path d="M22 4H32V8H22V4Z" fill="#008A3E" rx="1.5" />
                  <path d="M16 13H38L41 21H13L16 13Z" fill="#E6FAF0" />
                  <circle cx="13" cy="30" r="5" fill="#2E3338" />
                  <circle cx="13" cy="30" r="2" fill="#E5E7EB" />
                  <circle cx="41" cy="30" r="5" fill="#2E3338" />
                  <circle cx="41" cy="30" r="2" fill="#E5E7EB" />
                  <circle cx="7" cy="25" r="1.5" fill="#FEF08A" />
                  <circle cx="47" cy="25" r="1.5" fill="#EF4444" />
                </svg>
              ) : (
                /* Clean Scooter/Bike Icon matching reference */
                <svg width="38" height="28" viewBox="0 0 48 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11" cy="27" r="7" stroke="#2E3338" strokeWidth="3" fill="#FFFFFF" />
                  <circle cx="37" cy="27" r="7" stroke="#2E3338" strokeWidth="3" fill="#FFFFFF" />
                  <path d="M11 27H23L27 16H36" stroke="#00C058" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M33 11L37 16L34 27" stroke="#00C058" strokeWidth="3" strokeLinecap="round" />
                  <path d="M29 9H37" stroke="#2E3338" strokeWidth="3" strokeLinecap="round" />
                  <path d="M17 19H25" stroke="#2E3338" strokeWidth="3.5" strokeLinecap="round" />
                </svg>
              )}
            </div>

            <div className="vehicle-details">
              <div className="vehicle-title">{vehicleName}</div>
              <div className="vehicle-meta">
                <span className="meta-text">
                  <Clock size={11} className="meta-icon" />
                  <span>3-5 mins</span>
                </span>
                <span className="meta-separator">·</span>
                <span className="meta-text">
                  <Users size={11} className="meta-icon" />
                  <span>{passengerCount}</span>
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

        {/* Card 3: Route Locations (Clean & Precise) */}
        <section className="details-card card-route">
          <div className="route-layout">
            {/* Left Track Indicator */}
            <div className="route-track-column">
              {/* Pickup Pin Icon */}
              <div className="pin-pickup-wrapper">
                <div className="pin-pickup-outer">
                  <div className="pin-pickup-inner" />
                </div>
              </div>

              {/* Dotted Vertical Connector Line */}
              <div className="route-dots-stem">
                <span className="dot-step" />
                <span className="dot-step" />
                <span className="dot-step" />
                <span className="dot-step" />
              </div>

              {/* Dropoff Pin Icon */}
              <div className="pin-dropoff-wrapper">
                <svg width="18" height="22" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 0C4.48 0 0 4.48 0 10C0 17.5 10 24 10 24C10 24 20 17.5 20 10C20 4.48 15.52 0 10 0Z" fill="#EF4444" />
                  <circle cx="10" cy="9.5" r="4" fill="#FFFFFF" />
                </svg>
              </div>
            </div>

            {/* Right Location Names */}
            <div className="route-names-column">
              <div className="route-row-item pickup-row">
                <div className="location-heading">{pickupTitle}</div>
              </div>

              <div className="route-horizontal-divider" />

              <div className="route-row-item dropoff-row">
                <div className="location-heading">{dropoffTitle}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Card 3b: Driver Notes (conditional) */}
        {driverNotes && driverNotes.trim() !== '' && (
          <section className="details-card card-notes">
            <div className="notes-label">Notes for Driver</div>
            <div className="notes-text">{driverNotes.trim()}</div>
          </section>
        )}

        {/* Card 4: Metadata Table */}
        <section className="details-card card-table">
          {(() => {
            const sessionUser = currentUser || dbService?.session?.getCurrentUser();
            const displayName = customerName || sessionUser?.fullName || sessionUser?.full_name || sessionUser?.name;
            if (!displayName) return null;
            return (
              <div className="table-row">
                <span className="table-label">Nama Pemesan</span>
                <span className="table-value" style={{ fontWeight: 600, color: '#111827' }}>
                  {displayName}
                </span>
              </div>
            );
          })()}

          <div className="table-row">
            <span className="table-label">Status</span>
            <span className="status-badge-scheduled">
              Scheduled
            </span>
          </div>

          <div className="table-row">
            <span className="table-label">Payment</span>
            <span className="table-value">
              {paymentMethod === 'qris' ? 'QRIS SheRide' : 'SheRide Cash'}
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

        {/* Card 5: Fare Breakdown */}
        <section className="details-card card-fare">
          <div className="table-row">
            <span className="table-label">Tarif Perjalanan (Trip Fare)</span>
            <span className="table-value">{formatRupiah(displayTripFare)}</span>
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
        <section className="details-card card-admin-selection">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-section-title">Pilih Admin WhatsApp</h2>
              <div className="admin-section-subtitle">
                Pilih nomor admin untuk memproses & menugaskan driver
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
            <span>Book Now via WhatsApp ({selectedAdmin.name})</span>
          </button>

          <button
            type="button"
            className="btn-cancel-ride"
            onClick={() => { if (onCancelRide) onCancelRide(); else if (onBack) onBack(); }}
          >
            Cancel Booking
          </button>
        </div>
      </div>



      <style>{`
        /* Global Viewport: Flat clean background matching screenshot */
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

        /* Header */
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

        /* Scrollable Content Container */
        .ride-details-content {
          flex: 1;
          overflow-y: auto;
          padding: 10px 16px 24px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          -webkit-overflow-scrolling: touch;
        }

        /* Card: Flat, Clean White, No Shadow */
        .details-card {
          background: #FFFFFF;
          border-radius: 14px;
          padding: 16px;
          box-shadow: none !important;
          border: none !important;
        }

        /* Card 1: Scheduled Ride */
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
          box-shadow: none;
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

        /* Card 2: Vehicle & Fare */
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

        .fare-check-icon {
          flex-shrink: 0;
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

        /* Card 3: Route Locations (Matching Reference Pixel-Perfect) */
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

        /* Green Pickup Dot Ring */
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

        /* Vertical Connector Dots */
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

        /* Red Destination Pin */
        .pin-dropoff-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 20px;
        }

        /* Right Column Location Names */
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
          height: 26px;
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

        /* Card 3b: Notes */
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

        /* Card 4 & 5: Tables */
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
          letter-spacing: -0.2px;
        }

        .discount-text {
          color: #111827;
        }

        .table-label-with-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .admin-fee-badge {
          font-size: 10px;
          font-weight: 700;
          color: #FF337F;
          background: #FDF2F8;
          border: 1px solid #FBCFE8;
          padding: 1px 7px;
          border-radius: 9999px;
          letter-spacing: 0.2px;
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

        /* Bottom Dual Action Buttons */
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
          transition: background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
          font-family: inherit;
        }

        .btn-share-receipt:hover {
          background: #E11D6F;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(255, 51, 127, 0.4);
        }

        .btn-share-receipt:active {
          transform: translateY(0.5px);
        }

        .btn-locating-spin {
          width: 16px;
          height: 16px;
          border: 2.2px solid rgba(255, 255, 255, 0.35);
          border-top-color: #FFFFFF;
          border-radius: 50%;
          animation: spinLocating 0.7s linear infinite;
          display: inline-block;
          flex-shrink: 0;
        }

        @keyframes spinLocating {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .btn-cancel-ride {
          width: 100%;
          height: 48px;
          border-radius: 999px;
          background: #FFFFFF;
          border: 1.5px solid #F3D2DF;
          color: #FF337F;
          font-size: 15.5px;
          font-weight: 400;
          letter-spacing: -0.2px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: none !important;
          transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
          font-family: inherit;
        }

        .btn-cancel-ride:hover {
          background: #FFF0F5;
          border-color: #FF337F;
          transform: translateY(-1px);
        }

        .btn-cancel-ride:active {
          transform: translateY(0.5px);
        }

        .btn-cancel-ride:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          border-color: #E5E7EB;
          color: #9CA3AF;
          background: #F9FAFB;
        }

        /* Card 6: WhatsApp Admin Selection */
        .card-admin-selection {
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #FFFFFF;
          border-radius: 14px;
          padding: 16px;
        }

        .admin-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 2px;
        }

        .admin-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .admin-header-icon-box {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: #E8F8EE;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
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

        .admin-count-badge {
          background: #E8F8EE;
          color: #00B14F;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 12px;
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
          font-weight: 650;
          color: #111827;
          transition: color 0.15s ease;
        }

        .admin-item-tile.selected .admin-name {
          color: #008A3E;
          font-weight: 700;
        }

        /* Cancel Confirmation Modal */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .modal-container {
          background: #FFFFFF;
          border-radius: 18px;
          padding: 22px;
          max-width: 340px;
          width: 100%;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }

        .modal-icon-top {
          margin-bottom: 10px;
        }

        .modal-title {
          font-size: 16.5px;
          font-weight: 750;
          color: #111827;
          margin: 0 0 6px 0;
        }

        .modal-desc {
          font-size: 13px;
          color: #6B7280;
          line-height: 1.4;
          margin: 0 0 16px 0;
        }

        .modal-btn-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .btn-keep-ride {
          height: 40px;
          background: #F3F4F6;
          border: none;
          border-radius: 999px;
          color: #374151;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
        }

        .btn-confirm-cancel {
          height: 40px;
          background: #EF4444;
          border: none;
          border-radius: 999px;
          color: white;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
