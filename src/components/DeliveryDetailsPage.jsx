import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  ArrowLeft,
  ArrowUpDown,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Bookmark,
  CheckCircle2,
  X,
  Edit3,
  Phone,
  User,
  Package,
  Zap,
  ShieldCheck,
  Check
} from 'lucide-react';
import { formatRupiah, calculateFare } from '../utils/fareCalculator.js';
import { calculateHaversineDistance } from '../utils/geoUtils.js';

// ── Dropoff Mini Map (shown inside recipient/dropoff details modal) ──────────
function DropoffMiniMap({ dropoff }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const lat = dropoff?.lat || -5.1477;  // fallback: Mall Ratu Indah area
  const lng = dropoff?.lng || 119.4327;
  const name = dropoff?.name || 'Mall Ratu Indah';
  const address = dropoff?.address || 'Jl. DR. Ratulangi No.35, Mamajang';

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
    });

    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(map);

    // Custom red drop pin
    const dropoffIcon = L.divIcon({
      className: 'dd-minimap-pin',
      html: `
        <div class="dd-minimap-pin-outer">
          <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="ddPinGrad" x1="18" y1="2" x2="18" y2="42" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#FF3B30"/>
                <stop offset="100%" stop-color="#C0392B"/>
              </linearGradient>
            </defs>
            <path d="M18 2C9.16 2 2 9.16 2 18C2 29.25 16.35 42.3 17.05 42.92C17.59 43.4 18.41 43.4 18.95 42.92C19.65 42.3 34 29.25 34 18C34 9.16 26.84 2 18 2Z"
              fill="url(#ddPinGrad)" stroke="white" stroke-width="2.5"/>
            <circle cx="18" cy="17" r="6.5" fill="white"/>
            <circle cx="18" cy="17" r="3" fill="#C0392B"/>
          </svg>
          <div class="dd-minimap-pin-shadow"></div>
        </div>
      `,
      iconSize: [36, 44],
      iconAnchor: [18, 44]
    });

    markerRef.current = L.marker([lat, lng], { icon: dropoffIcon }).addTo(map);
    mapInstanceRef.current = map;

    // Slight pan up so pin isn't hidden behind the label
    map.panBy([0, -30], { animate: false });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="dd-minimap-wrapper">
      <div ref={mapRef} className="dd-minimap-canvas" />
      {/* Gradient overlay at bottom for readability */}
      <div className="dd-minimap-overlay">
        <div className="dd-minimap-label">
          <div className="dd-minimap-label-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" fill="white" />
            </svg>
          </div>
          <div className="dd-minimap-label-text">
            <span className="dd-minimap-label-name">{name}</span>
            <span className="dd-minimap-label-addr">{address}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// Blue Target Pin for Pickup (matching reference image)
function BlueTargetDot({ size = 18 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: '#0284C7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      <div
        style={{
          width: size * 0.44,
          height: size * 0.44,
          borderRadius: '50%',
          backgroundColor: '#FFFFFF'
        }}
      />
    </div>
  );
}

// Red Target Pin for Dropoff (matching reference image)
function RedTargetDot({ size = 18 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: '#EF4444',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      <div
        style={{
          width: size * 0.44,
          height: size * 0.44,
          borderRadius: '50%',
          backgroundColor: '#FFFFFF'
        }}
      />
    </div>
  );
}

// Custom 3D-styled Instant Lightning Box Icon
function InstantBoxIcon() {
  return (
    <div className="dd-icon-circle dd-instant-circle">
      <span className="dd-box-emoji">📦</span>
      <div className="dd-zap-badge">
        <Zap size={10} color="#FFFFFF" fill="#FFFFFF" />
      </div>
    </div>
  );
}

// Custom 3D-styled Bike Icon
function BikeOptionIcon() {
  return (
    <div className="dd-icon-circle dd-bike-circle">
      <span className="dd-bike-emoji">🛵</span>
    </div>
  );
}

// Custom 3D-styled Package Item Icon
function PackageItemIcon() {
  return (
    <div className="dd-icon-circle dd-package-circle">
      <span className="dd-item-emoji">📦</span>
    </div>
  );
}

export default function DeliveryDetailsPage({
  pickup,
  dropoff,
  onBack,
  onBook,
  onSwapLocations,
  distanceKm = 4.8
}) {
  // Sender Details (as seen in reference screenshot: Hasbullah • +6288705806690)
  const [senderInfo, setSenderInfo] = useState({
    name: 'Hasbullah',
    phone: '+6288705806690'
  });

  // Recipient Details (empty initially: "Add recipient details *")
  const [recipientInfo, setRecipientInfo] = useState({
    name: '',
    phone: '',
    floorUnit: '',
    noteToDriver: '',
    isSavedPlace: false
  });

  // Item Details (empty initially: "Add item details *")
  const [itemInfo, setItemInfo] = useState({
    itemName: '',
    category: 'food',
    weightTier: 'light',
    guarantee: '1 Basic'
  });

  // Vehicle Option: 'bike' | 'car'
  const [selectedVehicle, setSelectedVehicle] = useState('bike');
  const [isSavedBookmark, setIsSavedBookmark] = useState(false);
  const [isFareExpanded, setIsFareExpanded] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Modals state
  const [isRecipientModalOpen, setIsRecipientModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isOrderReviewModalOpen, setIsOrderReviewModalOpen] = useState(false);

  // Temporary modal states for editing
  const [tempRecipient, setTempRecipient] = useState({
    name: '',
    phone: '',
    floorUnit: '',
    noteToDriver: '',
    isSavedPlace: false
  });
  const [tempItem, setTempItem] = useState({ ...itemInfo });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  // Format dynamic drop-off time (e.g. Current Time + 35 mins -> "Drop off by 20:16 • Instant")
  const [dropoffEstimateTime, setDropoffEstimateTime] = useState('20:16');
  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 35);
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    setDropoffEstimateTime(`${hours}:${mins}`);
  }, []);

  // Accurate distance calculation between pickup and dropoff
  const actualDistance = Math.max(
    1.2,
    pickup?.lat && dropoff?.lat
      ? calculateHaversineDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng)
      : distanceKm || 4.5
  );

  // Dynamic Fare Calculation matching the screenshot
  // Screenshot shows: Total Rp30.500 (crossed out 34.500)
  const fareResult = calculateFare({
    serviceType: 'send',
    vehicleType: selectedVehicle === 'car' ? 'mobil' : 'motor',
    weightCategory: itemInfo.weightTier || 'light',
    distanceKm: actualDistance
  });

  const finalFare = selectedVehicle === 'car'
    ? Math.max(38000, Math.round((fareResult.totalFare * 1.5) / 500) * 500)
    : Math.max(25000, Math.round(fareResult.totalFare / 500) * 500);

  const handleReviewOrderClick = () => {
    // Check if recipient is filled, if not open recipient modal
    if (!recipientInfo.name.trim()) {
      setTempRecipient({ ...recipientInfo });
      setIsRecipientModalOpen(true);
      showToast('⚠️ Silakan lengkapi informasi penerima paket');
      return;
    }
    // Check if item is filled, if not open item modal
    if (!itemInfo.itemName.trim()) {
      setTempItem({ ...itemInfo });
      setIsItemModalOpen(true);
      showToast('⚠️ Silakan lengkapi rincian barang paket');
      return;
    }

    setIsOrderReviewModalOpen(true);
  };

  const handleFinalSubmitBooking = () => {
    setIsOrderReviewModalOpen(false);
    if (onBook) {
      onBook({
        serviceType: 'send',
        ride: {
          id: selectedVehicle === 'car' ? 'shesend-cargo' : 'shesend-instant',
          name: selectedVehicle === 'car' ? 'SheSend Car Cargo' : 'SheSend Instant Bike',
          price: finalFare
        },
        packageData: {
          itemName: itemInfo.itemName || 'Paket / Makanan',
          category: itemInfo.category,
          weightTier: itemInfo.weightTier,
          senderName: senderInfo.name,
          senderPhone: senderInfo.phone,
          recipientName: recipientInfo.name,
          recipientPhone: recipientInfo.phone,
          floorUnit: recipientInfo.floorUnit,
          specialNotes: recipientInfo.noteToDriver || 'Hati-hati di jalan, barang paket aman'
        }
      });
    }
  };

  // ─── Fullscreen Dropoff View ─────────────────────────────────────────────
  const dropoffMapRef = useRef(null);
  const dropoffMapInstanceRef = useRef(null);
  const dropoffPinTipRef = useRef(null);
  const [isDropoffMapMoving, setIsDropoffMapMoving] = useState(false);
  // Draggable sheet state: height as % of viewport
  const SHEET_COLLAPSED = 42;  // % — map is visible
  const SHEET_EXPANDED  = 85;  // % — full form visible
  const [sheetHeightPct, setSheetHeightPct] = useState(SHEET_COLLAPSED);
  const sheetDragRef = useRef({ dragging: false, startY: 0, startPct: SHEET_COLLAPSED });

  const dropoffLat = dropoff?.lat || -5.1477;
  const dropoffLng = dropoff?.lng || 119.4327;

  useEffect(() => {
    if (!isRecipientModalOpen) {
      // Destroy map when view closes to allow re-init next time
      if (dropoffMapInstanceRef.current) {
        dropoffMapInstanceRef.current.remove();
        dropoffMapInstanceRef.current = null;
      }
      return;
    }

    // Small delay so the DOM node is mounted before Leaflet init
    const timer = setTimeout(() => {
      if (!dropoffMapRef.current || dropoffMapInstanceRef.current) return;

      const map = L.map(dropoffMapRef.current, {
        center: [dropoffLat, dropoffLng],
        zoom: 17,
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }).addTo(map);

      map.on('movestart', () => setIsDropoffMapMoving(true));
      map.on('moveend', () => setIsDropoffMapMoving(false));

      // Invalidate after render so tiles load properly
      setTimeout(() => map.invalidateSize(), 60);

      dropoffMapInstanceRef.current = map;
    }, 60);

    return () => {
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecipientModalOpen]);

  // Render fullscreen dropoff details view
  if (isRecipientModalOpen) {
    return (
      <div className="dd-dropoff-fullscreen">
        {/* Toast */}
        {toastMessage && (
          <div className="ridego-toast-banner">
            <CheckCircle2 size={16} color="#00B14F" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1. Fullscreen Map */}
        <div ref={dropoffMapRef} className="dd-dropoff-map-canvas" />

        {/* 2. Fixed Red Pin Overlay */}
        <div className="dd-dropoff-center-pin">
          <div className={`dd-dropoff-pin-wrapper ${isDropoffMapMoving ? 'is-lifted' : ''}`}>
            <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="ddFsPinGrad" x1="20" y1="2" x2="20" y2="48" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FF3B30" />
                  <stop offset="100%" stopColor="#C0392B" />
                </linearGradient>
                <filter id="ddFsPinShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.28" />
                </filter>
              </defs>
              <path
                d="M20 2C10.06 2 2 10.06 2 20C2 31.5 18.2 47.6 18.96 48.32C19.54 48.8 20.46 48.8 21.04 48.32C21.8 47.6 38 31.5 38 20C38 10.06 29.94 2 20 2Z"
                fill="url(#ddFsPinGrad)"
                stroke="white"
                strokeWidth="2.5"
                filter="url(#ddFsPinShadow)"
              />
              <circle cx="20" cy="19" r="7" fill="white" />
              <circle cx="20" cy="19" r="3.2" fill="#C0392B" />
            </svg>
          </div>
          {/* Ground shadow dot */}
          <div className="dd-dropoff-pin-ground" ref={dropoffPinTipRef}>
            <div className={`dd-dropoff-pin-shadow-oval ${isDropoffMapMoving ? 'is-lifted' : ''}`} />
            <div className="dd-dropoff-pin-dot" />
          </div>
        </div>

        {/* 3. Top Bar: Back + Title */}
        <div className="dd-dropoff-top-bar">
          <button
            type="button"
            className="dd-dropoff-back-btn"
            onClick={() => setIsRecipientModalOpen(false)}
            aria-label="Kembali"
          >
            <ArrowLeft size={22} color="#1C1C1E" strokeWidth={2.4} />
          </button>
          <div className="dd-dropoff-top-pill">
            <div className="dd-dropoff-pill-red-dot">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" fill="#EF4444" />
                <circle cx="8" cy="8" r="2.5" fill="#FFFFFF" />
              </svg>
            </div>
            <span className="dd-dropoff-pill-text">
              {dropoff?.name || 'Mall Ratu Indah'}
            </span>
          </div>
        </div>

        {/* 4. Bottom Sheet with form — draggable up/down */}
        <div
          className="dd-dropoff-bottom-sheet"
          style={{ height: `${sheetHeightPct}%` }}
        >
          {/* ── Drag Handle (touch & mouse) ── */}
          <div
            className="dd-dropoff-sheet-handle-zone"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              sheetDragRef.current = {
                dragging: true,
                startY: e.clientY,
                startPct: sheetHeightPct
              };
            }}
            onPointerMove={(e) => {
              if (!sheetDragRef.current.dragging) return;
              const deltaY = sheetDragRef.current.startY - e.clientY;
              const viewH = window.innerHeight;
              const deltaPct = (deltaY / viewH) * 100;
              const newPct = Math.min(
                SHEET_EXPANDED,
                Math.max(SHEET_COLLAPSED - 10, sheetDragRef.current.startPct + deltaPct)
              );
              setSheetHeightPct(newPct);
            }}
            onPointerUp={() => {
              sheetDragRef.current.dragging = false;
              // Snap to nearest position
              const mid = (SHEET_COLLAPSED + SHEET_EXPANDED) / 2;
              setSheetHeightPct(sheetHeightPct > mid ? SHEET_EXPANDED : SHEET_COLLAPSED);
            }}
          >
            <div className="dd-dropoff-sheet-handle" />
          </div>

          <div className="dd-dropoff-sheet-title">Dropoff details</div>

          <div className="dd-dropoff-form-scroll">
            {/* Address display */}
            <div className="dd-form-group">
              <label className="dd-form-label">Address</label>
              <div className="dd-address-display-card">
                <span className="dd-address-card-text">
                  {dropoff?.name || 'Mall Ratu Indah'} • {dropoff?.address || 'Jl. DR. Ratulangi No.35, Mamajang, Kota Makassar'}
                </span>
                <ChevronRight size={18} color="#111827" />
              </div>
            </div>

            {/* Floor and unit */}
            <div className="dd-form-group">
              <label className="dd-form-label">Floor and unit no.</label>
              <input
                type="text"
                maxLength={120}
                className="dd-input-text dd-rounded-input"
                placeholder="Add floor or unit no."
                value={tempRecipient.floorUnit}
                onChange={(e) => setTempRecipient((prev) => ({ ...prev, floorUnit: e.target.value }))}
              />
              <span className="dd-char-count">{tempRecipient.floorUnit.length}/120</span>
            </div>

            {/* Contact name */}
            <div className="dd-form-group">
              <label className="dd-form-label">
                Contact name <span className="dd-required-star">*</span>
              </label>
              <input
                type="text"
                className="dd-input-text dd-rounded-input"
                placeholder="Name"
                value={tempRecipient.name}
                onChange={(e) => setTempRecipient((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* Contact number */}
            <div className="dd-form-group">
              <label className="dd-form-label">
                Contact number <span className="dd-required-star">*</span>
              </label>
              <input
                type="tel"
                className="dd-input-text dd-rounded-input"
                placeholder="Phone number"
                value={tempRecipient.phone}
                onChange={(e) => setTempRecipient((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            {/* Note to driver */}
            <div className="dd-form-group">
              <label className="dd-form-label">Note to driver</label>
              <input
                type="text"
                maxLength={120}
                className="dd-input-text dd-rounded-input"
                placeholder="Add a note to driver"
                value={tempRecipient.noteToDriver}
                onChange={(e) => setTempRecipient((prev) => ({ ...prev, noteToDriver: e.target.value }))}
              />
              <span className="dd-char-count">{tempRecipient.noteToDriver.length}/120</span>
            </div>

            {/* Save this place */}
            <div
              className="dd-save-place-row"
              onClick={() => setTempRecipient((prev) => ({ ...prev, isSavedPlace: !prev.isSavedPlace }))}
            >
              <div>
                <div className="dd-save-place-title">Save this place</div>
                <div className="dd-save-place-sub">Save this location for future orders.</div>
              </div>
              <div className={`dd-custom-checkbox ${tempRecipient.isSavedPlace ? 'checked' : ''}`}>
                {tempRecipient.isSavedPlace && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
              </div>
            </div>
          </div>

          {/* Confirm CTA */}
          <div className="dd-dropoff-sheet-footer">
            <button
              type="button"
              className={`dd-btn-confirm ${tempRecipient.name.trim() && tempRecipient.phone.trim() ? 'active' : ''}`}
              onClick={() => {
                if (!tempRecipient.name.trim()) {
                  showToast('⚠️ Contact name wajib diisi');
                  return;
                }
                if (!tempRecipient.phone.trim()) {
                  showToast('⚠️ Contact number wajib diisi');
                  return;
                }
                setRecipientInfo(tempRecipient);
                setIsRecipientModalOpen(false);
                showToast('✅ Dropoff details berhasil disimpan');
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  }
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="dd-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="ridego-toast-banner">
          <CheckCircle2 size={16} color="#00B14F" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Navigation Bar */}
      <header className="dd-header-bar">
        <div className="dd-header-left">
          <button
            type="button"
            className="dd-btn-back"
            onClick={onBack}
            aria-label="Kembali"
          >
            <ArrowLeft size={22} color="#111827" strokeWidth={2.4} />
          </button>
          <h1 className="dd-header-title">Delivery Details</h1>
        </div>
      </header>

      {/* 2. Scrollable Body Content */}
      <div className="dd-scroll-content">
        {/* Main Delivery Details Card */}
        <div className="dd-main-card">
          {/* Section A: Route Points (Pickup & Dropoff) */}
          <div className="dd-route-section">
            {/* Pickup Row */}
            <div className="dd-route-row">
              <div className="dd-route-dot-col">
                <BlueTargetDot size={18} />
                <div className="dd-dotted-line">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </div>

              <div className="dd-route-text-col">
                <div className="dd-location-title">
                  {pickup?.name || 'B/15, Graha Sejahtera Residence'}
                </div>
                <div className="dd-location-subtitle">
                  {senderInfo.name} • {senderInfo.phone}
                </div>
              </div>

              <button
                type="button"
                className="dd-btn-swap"
                onClick={() => {
                  if (onSwapLocations) onSwapLocations();
                  showToast('🔄 Titik ambil dan titik antar ditukar');
                }}
                title="Tukar titik pengambilan dan tujuan"
                aria-label="Tukar lokasi"
              >
                <ArrowUpDown size={16} color="#9CA3AF" />
              </button>
            </div>

            {/* Dropoff Row */}
            <div className="dd-route-row dd-dropoff-row">
              <div className="dd-route-dot-col">
                <RedTargetDot size={18} />
              </div>

              <div className="dd-route-text-col">
                <div className="dd-location-title">
                  {dropoff?.name || 'Mall Ratu Indah'}
                </div>
                <button
                  type="button"
                  className="dd-btn-recipient-link"
                  onClick={() => {
                    setTempRecipient({ ...recipientInfo });
                    setIsRecipientModalOpen(true);
                  }}
                >
                  {recipientInfo.name ? (
                    <span className="dd-filled-recipient">
                      {recipientInfo.name} • {recipientInfo.phone || 'No phone'}
                      {recipientInfo.floorUnit ? ` (${recipientInfo.floorUnit})` : ''}
                    </span>
                  ) : (
                    <span className="dd-add-recipient-prompt">
                      Add recipient details <span className="dd-required-star">*</span>
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="dd-card-divider" />

          {/* Section B: Timing Row (Pick up now) */}
          <div
            className="dd-interactive-row"
            onClick={() => showToast('⚡ Layanan Instant: Kurir segera dijemput dalam 15-30 menit')}
          >
            <div className="dd-row-left">
              <InstantBoxIcon />
              <div className="dd-row-text">
                <div className="dd-row-title">Pick up now (30 min or less)</div>
                <div className="dd-row-sub">
                  Drop off by {dropoffEstimateTime} • Instant
                </div>
              </div>
            </div>
            <ChevronRight size={18} color="#9CA3AF" />
          </div>

          <div className="dd-card-divider" />

          {/* Section C: Vehicle Row (Bike / Car) */}
          <div
            className="dd-interactive-row"
            onClick={() => setIsVehicleModalOpen(true)}
          >
            <div className="dd-row-left">
              <BikeOptionIcon />
              <div className="dd-row-text">
                <div className="dd-row-title">
                  {selectedVehicle === 'car' ? 'Car Cargo' : 'Bike'}
                </div>
                <div className="dd-row-sub">
                  {selectedVehicle === 'car'
                    ? 'For large items, max 50kg'
                    : 'For small items, max 20kg'}
                </div>
              </div>
            </div>
            <ChevronRight size={18} color="#9CA3AF" />
          </div>

          <div className="dd-card-divider" />

          {/* Section D: Item Details Row */}
          <div
            className="dd-interactive-row"
            onClick={() => {
              setTempItem({ ...itemInfo });
              setIsItemModalOpen(true);
            }}
          >
            <div className="dd-row-left">
              <PackageItemIcon />
              <div className="dd-row-text">
                <div className="dd-row-title">
                  {itemInfo.itemName ? (
                    <span className="dd-filled-item-name">{itemInfo.itemName}</span>
                  ) : (
                    <span className="dd-add-item-prompt">
                      Add item details <span className="dd-required-star">*</span>
                    </span>
                  )}
                </div>
                <div className="dd-row-sub">
                  Delivery Guarantee • {itemInfo.guarantee}
                </div>
              </div>
            </div>
            <ChevronRight size={18} color="#9CA3AF" />
          </div>
        </div>

      </div>

      {/* 4. Bottom Sticky Checkout / Action Panel */}
      <div className="dd-bottom-panel">
        {/* Fare Breakdown Dropdown (when expanded) */}
        {isFareExpanded && (
          <div className="dd-fare-breakdown-box">
            <div className="breakdown-row">
              <span>Tarif Dasar ({actualDistance.toFixed(1)} km)</span>
              <span>{formatRupiah(finalFare)}</span>
            </div>
            <div className="breakdown-row fee">
              <span>Jaminan Perlindungan Paket</span>
              <span className="free-badge">Gratis</span>
            </div>
          </div>
        )}

        {/* Total Price Row */}
        <div
          className="dd-total-row"
          onClick={() => setIsFareExpanded(!isFareExpanded)}
        >
          <span className="dd-total-label">Total</span>
          <div className="dd-total-price-wrap">
            <span className="dd-price-current">
              Rp{finalFare.toLocaleString('id-ID')}
            </span>
            <button
              type="button"
              className="dd-btn-toggle-fare"
              aria-label="Rincian harga"
            >
              {isFareExpanded ? (
                <ChevronDown size={17} color="#6B7280" />
              ) : (
                <ChevronUp size={17} color="#6B7280" />
              )}
            </button>
          </div>
        </div>

        {/* Buttons Row (Bookmark + Review Order Pill Button) */}
        <div className="dd-actions-row">
          <button
            type="button"
            className={`dd-btn-bookmark ${isSavedBookmark ? 'saved' : ''}`}
            onClick={() => {
              setIsSavedBookmark(!isSavedBookmark);
              showToast(
                !isSavedBookmark
                  ? '🔖 Rute pengiriman disimpan ke favorit'
                  : 'Rute dihapus dari favorit'
              );
            }}
            title="Simpan pengiriman ini"
            aria-label="Simpan pengiriman"
          >
            <Bookmark
              size={20}
              color="#00B14F"
              fill={isSavedBookmark ? '#00B14F' : 'none'}
            />
          </button>

          <button
            type="button"
            className="dd-btn-review-order"
            onClick={handleReviewOrderClick}
          >
            Review Order
          </button>
        </div>
      </div>

      {/* =========================================================================
          MODALS & SHEETS
          ========================================================================= */}


      {/* Modal 2: Item Details */}

      {isItemModalOpen && (
        <div
          className="dd-modal-overlay"
          onClick={() => setIsItemModalOpen(false)}
        >
          <div
            className="dd-modal-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dd-modal-header">
              <div className="dd-modal-title-wrap">
                <Package size={19} color="#00B14F" />
                <h3 className="dd-modal-title">Item Details</h3>
              </div>
              <button
                type="button"
                className="dd-btn-close-modal"
                onClick={() => setIsItemModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="dd-modal-body">
              {/* Preset Category Chips */}
              <div className="dd-form-group">
                <label className="dd-form-label">Kategori Barang</label>
                <div className="dd-cat-chips">
                  {[
                    { id: 'food', label: '🍱 Makanan / Kue', defaultName: 'Kue / Makanan Basah' },
                    { id: 'document', label: '📄 Dokumen', defaultName: 'Dokumen Penting' },
                    { id: 'fashion', label: '👗 Pakaian', defaultName: 'Baju / Hijab' },
                    { id: 'beauty', label: '💄 Kosmetik', defaultName: 'Skincare' },
                    { id: 'goods', label: '📦 Paket Barang', defaultName: 'Barang' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`dd-cat-chip ${tempItem.category === cat.id ? 'active' : ''}`}
                      onClick={() =>
                        setTempItem((prev) => ({
                          ...prev,
                          category: cat.id,
                          itemName: prev.itemName ? prev.itemName : cat.defaultName
                        }))
                      }
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Item Name */}
              <div className="dd-form-group">
                <label className="dd-form-label">Item Description / Name *</label>
                <input
                  type="text"
                  className="dd-input-text"
                  placeholder="e.g. Kue Ulang Tahun, Baju Gamis..."
                  value={tempItem.itemName}
                  onChange={(e) =>
                    setTempItem((prev) => ({ ...prev, itemName: e.target.value }))
                  }
                  autoFocus
                />
              </div>

              {/* Weight Tier Chips */}
              <div className="dd-form-group">
                <label className="dd-form-label">Estimasi Berat</label>
                <div className="dd-weight-chips">
                  <button
                    type="button"
                    className={`dd-weight-chip ${tempItem.weightTier === 'light' ? 'active' : ''}`}
                    onClick={() => setTempItem((p) => ({ ...p, weightTier: 'light' }))}
                  >
                    <span>&lt; 2 kg</span>
                    <span className="sub">Standar</span>
                  </button>
                  <button
                    type="button"
                    className={`dd-weight-chip ${tempItem.weightTier === 'medium' ? 'active' : ''}`}
                    onClick={() => setTempItem((p) => ({ ...p, weightTier: 'medium' }))}
                  >
                    <span>2 - 5 kg</span>
                    <span className="sub">+Rp 2.000</span>
                  </button>
                  <button
                    type="button"
                    className={`dd-weight-chip ${tempItem.weightTier === 'heavy' ? 'active' : ''}`}
                    onClick={() => setTempItem((p) => ({ ...p, weightTier: 'heavy' }))}
                  >
                    <span>5 - 10 kg</span>
                    <span className="sub">+Rp 5.000</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="dd-modal-footer">
              <button
                type="button"
                className="dd-btn-save-modal"
                onClick={() => {
                  if (!tempItem.itemName.trim()) {
                    showToast('⚠️ Nama barang wajib diisi');
                    return;
                  }
                  setItemInfo(tempItem);
                  setIsItemModalOpen(false);
                  showToast('✅ Detail barang berhasil disimpan');
                }}
              >
                Save Item Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Vehicle Type Selection */}
      {isVehicleModalOpen && (
        <div
          className="dd-modal-overlay"
          onClick={() => setIsVehicleModalOpen(false)}
        >
          <div
            className="dd-modal-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dd-modal-header">
              <h3 className="dd-modal-title">Select Delivery Vehicle</h3>
              <button
                type="button"
                className="dd-btn-close-modal"
                onClick={() => setIsVehicleModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="dd-modal-body">
              {/* Option 1: Bike */}
              <div
                className={`dd-vehicle-card ${selectedVehicle === 'bike' ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedVehicle('bike');
                  setIsVehicleModalOpen(false);
                  showToast('🛵 Kendaraan dipilih: Bike (Max 20kg)');
                }}
              >
                <div className="dd-vehicle-left">
                  <div className="dd-icon-circle dd-bike-circle">
                    <span className="dd-bike-emoji">🛵</span>
                  </div>
                  <div>
                    <div className="dd-vehicle-title">Bike (Motor Kurir)</div>
                    <div className="dd-vehicle-desc">For small items, max 20kg</div>
                  </div>
                </div>
                <div className="dd-vehicle-price">
                  Rp{finalFare.toLocaleString('id-ID')}
                </div>
              </div>

              {/* Option 2: Car Cargo */}
              <div
                className={`dd-vehicle-card ${selectedVehicle === 'car' ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedVehicle('car');
                  setIsVehicleModalOpen(false);
                  showToast('🚗 Kendaraan dipilih: Car Cargo (Max 50kg)');
                }}
              >
                <div className="dd-vehicle-left">
                  <div className="dd-icon-circle" style={{ background: '#FFF1F2' }}>
                    <span style={{ fontSize: 18 }}>🚗</span>
                  </div>
                  <div>
                    <div className="dd-vehicle-title">Car Cargo (Mobil)</div>
                    <div className="dd-vehicle-desc">For large items, max 50kg</div>
                  </div>
                </div>
                <div className="dd-vehicle-price">
                  Rp{(finalFare + 15000).toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Review Order Summary Sheet */}
      {isOrderReviewModalOpen && (
        <div
          className="dd-modal-overlay"
          onClick={() => setIsOrderReviewModalOpen(false)}
        >
          <div
            className="dd-modal-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dd-modal-header">
              <div className="dd-modal-title-wrap">
                <ShieldCheck size={20} color="#00B14F" />
                <h3 className="dd-modal-title">Review Order</h3>
              </div>
              <button
                type="button"
                className="dd-btn-close-modal"
                onClick={() => setIsOrderReviewModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="dd-modal-body">
              <div className="dd-review-card">
                <div className="dd-review-item">
                  <span className="label">Pengirim:</span>
                  <span className="val">{senderInfo.name} ({senderInfo.phone})</span>
                </div>
                <div className="dd-review-item">
                  <span className="label">Titik Jemput:</span>
                  <span className="val">{pickup?.name || 'B/15, Graha Sejahtera Residence'}</span>
                </div>
                <div className="dd-review-item">
                  <span className="label">Penerima:</span>
                  <span className="val">{recipientInfo.name} ({recipientInfo.phone})</span>
                </div>
                <div className="dd-review-item">
                  <span className="label">Titik Antar:</span>
                  <span className="val">{dropoff?.name || 'Mall Ratu Indah'}</span>
                </div>
                <div className="dd-review-item">
                  <span className="label">Barang:</span>
                  <span className="val">{itemInfo.itemName}</span>
                </div>
                <div className="dd-review-item">
                  <span className="label">Kendaraan:</span>
                  <span className="val">{selectedVehicle === 'car' ? 'Car Cargo (50kg)' : 'Bike (20kg)'}</span>
                </div>
                <div className="dd-review-item total">
                  <span className="label">Total Pembayaran:</span>
                  <span className="price">Rp{finalFare.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <div className="dd-modal-footer">
              <button
                type="button"
                className="dd-btn-submit-booking"
                onClick={handleFinalSubmitBooking}
              >
                Kirim via WhatsApp Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
