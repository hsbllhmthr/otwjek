import React, { useState } from 'react';
import { ChevronLeft, Info, ShieldCheck, MoreHorizontal, Send, ChevronRight, Plus, UserCheck } from 'lucide-react';
import { formatRupiah } from '../../utils/fareCalculator.js';
import { buildWhatsAppLink, formatBookingMessage } from '../../utils/whatsappTemplate.js';
import { ADMINS } from '../../data/admins.js';

export default function Screen3SuggestedRides({
  pickup,
  dropoff,
  distanceKm,
  fareBreakdown,
  onBack,
  selectedDriver,
  onOpenDriverCatalog,
  driverNotes,
  durationMinutes = 18
}) {
  const [selectedRideId, setSelectedRideId] = useState('protect');
  const [showAllRides, setShowAllRides] = useState(false);

  // Ride types
  const baseFare = fareBreakdown?.totalFare || 18000;

  const rideOptions = [
    {
      id: 'protect',
      name: 'SheRide Protect',
      desc: '100% Mitra Perempuan Terverifikasi, Helm Steril',
      price: baseFare + 2000,
      icon: '🛵',
      highlight: true
    },
    {
      id: 'regular',
      name: 'SheRide Motor',
      desc: 'Cepat & praktis sesama perempuan',
      price: baseFare,
      originalPrice: baseFare + 3000,
      icon: '🛵',
      highlight: false
    },
    {
      id: 'car',
      name: 'SheRide Mobil (Car)',
      desc: 'Kabin AC sejuk, bebas asap rokok, 4 kursi',
      price: Math.round(baseFare * 1.8),
      icon: '🚗',
      highlight: false
    },
    {
      id: 'send',
      name: 'SheSend Express',
      desc: 'Kurir barang & dokumen terpercaya',
      price: Math.round(baseFare * 1.1),
      icon: '📦',
      highlight: false
    }
  ];

  const currentRide = rideOptions.find(r => r.id === selectedRideId) || rideOptions[0];

  // Handle Book via WhatsApp — Auto-rotasi 4 admin di latar belakang
  const handleBookWhatsApp = () => {
    const lastIdx = parseInt(localStorage.getItem('last_admin_dispatch_index') || '-1', 10);
    const nextIdx = (lastIdx + 1) % ADMINS.length;
    localStorage.setItem('last_admin_dispatch_index', nextIdx.toString());
    const targetAdmin = ADMINS[nextIdx] || ADMINS[0];

    const message = formatBookingMessage({
      serviceType: currentRide.id === 'send' ? 'send' : 'ride',
      vehicleType: currentRide.id === 'car' ? 'mobil' : 'motor',
      pickupAddress: pickup?.name || pickup?.address || 'Titik Jemput',
      dropoffAddress: dropoff?.name || dropoff?.address || 'Titik Tujuan',
      distanceKm,
      formattedFare: formatRupiah(currentRide.price),
      customerName: 'Pelanggan Perempuan',
      customerNotes: driverNotes || '',
      driverName: selectedDriver?.name || 'Acak (Dicarikan Admin)',
      packageDetails: currentRide.id === 'send' ? 'Paket / Makanan' : '',
      paymentMethod: 'cash'
    });

    const url = buildWhatsAppLink(targetAdmin.phone, message);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="screen-container">
      {/* Top Header: Back Button */}
      <div className="app-screen-header">
        <button className="btn-header-back" onClick={onBack} title="Kembali ke Titik Jemput">
          <ChevronLeft size={20} />
        </button>

        {/* Floating Route Badges (like reference screen 4) */}
        <div className="floating-eta-badge">
          <div>
            <span className="eta-time">{durationMinutes} - {durationMinutes + 5} min</span>
            <div className="eta-label">Lokasi pin &gt;</div>
          </div>
        </div>

        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1 }} />

      {/* Destination Chip on Map */}
      <div className="destination-chip-floating">
        <span className="dest-chip-text">
          {dropoff?.name ? (dropoff.name.length > 20 ? dropoff.name.slice(0, 18) + '...' : dropoff.name) : 'Pintu Masuk...'}
        </span>
        <ChevronRight size={14} />
        <div style={{ width: 1, height: 14, background: '#E5E7EB', margin: '0 4px' }} />
        <Plus size={15} style={{ color: '#FF337F', cursor: 'pointer' }} />
      </div>

      {/* Bottom Sheet Card */}
      <div className="grab-bottom-sheet">
        {/* Header: Suggested Rides */}
        <div className="suggested-rides-header">
          <div className="suggested-title">Suggested Rides</div>
          <button
            className="btn-view-all"
            onClick={() => setShowAllRides(!showAllRides)}
          >
            {showAllRides ? 'Hide ^' : 'View All ^'}
          </button>
        </div>

        {/* Ride Options List */}
        <div className="ride-options-list">
          {(showAllRides ? rideOptions : rideOptions.slice(0, 2)).map((ride) => {
            const isSelected = selectedRideId === ride.id;
            return (
              <div
                key={ride.id}
                className={`ride-option-row ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedRideId(ride.id)}
              >
                <div className="ride-row-left">
                  <div className="ride-icon-badge">{ride.icon}</div>
                  <div>
                    <div className="ride-name-row">
                      <span className="ride-name">{ride.name}</span>
                      <Info size={13} style={{ color: '#8E8E93', cursor: 'pointer' }} />
                    </div>
                    <div className="ride-desc">{ride.desc}</div>
                  </div>
                </div>

                <div className="ride-price-col">
                  <div className="ride-price">{formatRupiah(ride.price)}</div>
                  {ride.originalPrice && (
                    <div className="ride-price-strikethrough">
                      {formatRupiah(ride.originalPrice)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Driver Banner (if any) */}
        {selectedDriver && (
          <div className="selected-driver-strip">
            <UserCheck size={14} color="#FF337F" />
            <span>Driver Pilihan: <strong>{selectedDriver.name}</strong> ({selectedDriver.vehicleModel})</span>
          </div>
        )}

        {/* Dark Green Banner: "New! Ride Cover is now available to you." */}
        <div className="ride-cover-banner">
          <span>🌸 New! Sisterhood Ride Cover is now available to you.</span>
        </div>

        {/* Payment & Admin Dispatcher Row */}
        <div className="payment-bar-row">
          <div className="payment-left">
            <span className="payment-tag">TUNAI / WA</span>
            <span>Rp0</span>
          </div>

          <div className="safety-badge-pill">
            <ShieldCheck size={14} />
            <span>AMAN DIJALAN</span>
          </div>
        </div>

        {/* Dual Bottom Buttons: "Book" & "GrabNow / Pilih Driver" */}
        <div className="dual-action-buttons">
          <button
            className="btn-grab-confirm"
            onClick={handleBookWhatsApp}
            id="btn-book-action"
          >
            <Send size={16} />
            <span>Book</span>
          </button>

          <button
            className="btn-grab-now"
            onClick={onOpenDriverCatalog}
            id="btn-grabnow-action"
          >
            <span>GrabNow</span>
          </button>
        </div>
      </div>

      <style>{`
        .screen-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          position: relative;
        }

        .destination-chip-floating {
          position: absolute;
          bottom: 330px;
          right: 14px;
          background: white;
          box-shadow: var(--shadow-float);
          border-radius: var(--radius-full);
          padding: 6px 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-main);
          z-index: 990;
          border: 1px solid rgba(0, 0, 0, 0.06);
        }

        .dest-chip-text {
          max-width: 140px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .selected-driver-strip {
          background: #EBF8F0;
          border: 1px solid rgba(0, 177, 79, 0.2);
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 11px;
          color: #024724;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
        }

        .admin-switch-pill {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 700;
          color: #48484A;
          cursor: pointer;
          background: #F2F4F7;
          padding: 3px 8px;
          border-radius: 99px;
        }

        .admin-switch-pill:hover {
          background: #E5E7EB;
        }
      `}</style>
    </div>
  );
}
