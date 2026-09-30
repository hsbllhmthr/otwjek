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
  Check,
  Calendar,
  Share2,
  Camera,
  FileText,
  Utensils,
  Shirt,
  Laptop,
  AlertCircle
} from 'lucide-react';
import { formatRupiah, calculateFare } from '../utils/fareCalculator.js';
import { calculateHaversineDistance, reverseGeocodeNominatim } from '../utils/geoUtils.js';

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
  }, [lat, lng]);

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

// ── Delivery Speed Option Icons (matching reference screenshot) ─────────────
function DeliveryInstantIcon({ size = 42 }) {
  const iconSize = Math.round(size * 0.57); // 24px when size=42
  const badgeSize = Math.round(size * 0.36); // 15px when size=42
  const badgeIconSize = Math.max(8, Math.round(badgeSize * 0.58));
  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        backgroundColor: '#BAE6FD',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0
      }}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <path d="M4 8L12 3.5L20 8V16.5L12 21L4 16.5V8Z" fill="#D97706" />
        <path d="M12 3.5L20 8L12 12.5L4 8L12 3.5Z" fill="#F59E0B" />
        <path d="M12 12.5V21L20 16.5V8L12 12.5Z" fill="#B45309" />
        <path d="M10 5.7L14 7.9L12 9L8 6.8L10 5.7Z" fill="#FDE68A" />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: badgeSize,
          height: badgeSize,
          borderRadius: '50%',
          backgroundColor: '#0284C7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1.5px solid #FFFFFF',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}
      >
        <svg width={badgeIconSize} height={badgeIconSize} viewBox="0 0 24 24" fill="#FFFFFF">
          <path d="M13 2L4 13H11L10 22L19 11H12L13 2Z" />
        </svg>
      </div>
    </div>
  );
}

function DeliveryHematIcon({ size = 42 }) {
  const iconSize = Math.round(size * 0.57); // 24px when size=42
  const badgeWidth = Math.round(size * 0.38); // 16px when size=42
  const badgeHeight = Math.round(size * 0.31); // 13px when size=42
  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        backgroundColor: '#BAE6FD',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0
      }}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <path d="M4 8L12 3.5L20 8V16.5L12 21L4 16.5V8Z" fill="#D97706" />
        <path d="M12 3.5L20 8L12 12.5L4 8L12 3.5Z" fill="#F59E0B" />
        <path d="M12 12.5V21L20 16.5V8L12 12.5Z" fill="#B45309" />
        <path d="M10 5.7L14 7.9L12 9L8 6.8L10 5.7Z" fill="#FDE68A" />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: badgeWidth,
          height: badgeHeight,
          borderRadius: 3.5,
          backgroundColor: '#0284C7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1.5px solid #FFFFFF',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}
      >
        <svg width="10" height="7" viewBox="0 0 16 10" fill="none">
          <rect width="16" height="10" rx="2" fill="#0284C7" />
          <rect y="1.5" width="16" height="2" fill="#FFFFFF" />
          <circle cx="12" cy="7" r="1.5" fill="#FFFFFF" />
        </svg>
      </div>
    </div>
  );
}

function DeliverySameDayIcon({ size = 46 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: '#FDF2F8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0
      }}
    >
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
        <path d="M4 8L12 3.5L20 8V16.5L12 21L4 16.5V8Z" fill="#D97706" />
        <path d="M12 3.5L20 8L12 12.5L4 8L12 3.5Z" fill="#F59E0B" />
        <path d="M12 12.5V21L20 16.5V8L12 12.5Z" fill="#B45309" />
        <path d="M10 5.7L14 7.9L12 9L8 6.8L10 5.7Z" fill="#FDE68A" />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 1,
          right: 1,
          width: 17,
          height: 17,
          borderRadius: '50%',
          backgroundColor: '#FF337F',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1.5px solid #FFFFFF'
        }}
      >
        <span style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 900, lineHeight: 1 }}>%</span>
      </div>
    </div>
  );
}

// ── Delivery Parcel Box Illustration (pure box with dimensions & feminine pink theme) ─────────────
function DeliveryDriverBoxIllustration({ selectedSize = 'S' }) {
  const dimensions = {
    S: { height: '20cm', width: '40cm', length: '40cm' },
    M: { height: '30cm', width: '50cm', length: '50cm' },
    L: { height: '40cm', width: '70cm', length: '70cm' }
  }[selectedSize] || { height: '20cm', width: '40cm', length: '40cm' };

  const scale = selectedSize === 'L' ? 1.14 : selectedSize === 'M' ? 1.0 : 0.88;

  return (
    <div className="dd-item-illustration-container">
      <div
        style={{
          transform: `scale(${scale})`,
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transformOrigin: 'center',
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <svg width="280" height="180" viewBox="0 0 280 180" fill="none">
          {/* Soft Ground Shadow */}
          <ellipse cx="160" cy="144" rx="72" ry="14" fill="#FCE7F3" opacity="0.8" />

          {/* ── Feminine 3D Parcel Box (Isometric) ── */}
          {/* Top Face (Warm Sakura Pink) */}
          <polygon points="95,50 175,26 240,64 160,88" fill="#F472B6" />
          {/* Top Face Center Tape (Cream / Pastel Ribbon) */}
          <polygon points="128,40 150,33 198,73 176,80" fill="#FFF0F5" opacity="0.95" />

          {/* Left Face (Vibrant Rose) */}
          <polygon points="95,50 160,88 160,142 95,104" fill="#EC4899" />
          {/* Corner tape patch on left face */}
          <path
            d="M95 94C98 92 104 96 106 102C108 108 104 113 95 104Z"
            fill="#FBCFE8"
            opacity="0.9"
          />

          {/* Right Face (Deep Chic Rose Shadow) */}
          <polygon points="160,88 240,64 240,118 160,142" fill="#DB2777" />
          {/* Tape sticker patch on right face */}
          <path
            d="M184 108C190 106 196 110 197 116C198 122 191 127 185 124C180 121 179 110 184 108Z"
            fill="#FBCFE8"
            opacity="0.95"
          />

          {/* Cute SheSend Heart / Ribbon on Front */}
          <circle cx="128" cy="100" r="10" fill="#FDF2F8" opacity="0.9" />
          <path
            d="M128 104L124 100C122.5 98.5 122.5 96 124 94.5C125.5 93 128 94.5 128 94.5C128 94.5 130.5 93 132 94.5C133.5 96 133.5 98.5 132 100L128 104Z"
            fill="#FF337F"
          />

          {/* ── Measurement Indicators (Crisp Pink Lines) ── */}
          {/* 1. Top Width Measurement */}
          <line x1="93" y1="38" x2="170" y2="15" stroke="#E11D6F" strokeWidth="1.3" />
          <line x1="93" y1="33" x2="93" y2="43" stroke="#E11D6F" strokeWidth="1.3" />
          <line x1="170" y1="10" x2="170" y2="20" stroke="#E11D6F" strokeWidth="1.3" />
          <text
            x="128"
            y="18"
            fill="#831843"
            fontSize="13"
            fontWeight="750"
            textAnchor="middle"
          >
            {dimensions.width}
          </text>

          {/* 2. Left Height Measurement */}
          <line x1="82" y1="54" x2="82" y2="100" stroke="#E11D6F" strokeWidth="1.3" />
          <line x1="76" y1="54" x2="88" y2="54" stroke="#E11D6F" strokeWidth="1.3" />
          <line x1="76" y1="100" x2="88" y2="100" stroke="#E11D6F" strokeWidth="1.3" />
          <text
            x="68"
            y="80"
            fill="#831843"
            fontSize="13"
            fontWeight="750"
            textAnchor="end"
          >
            {dimensions.height}
          </text>

          {/* 3. Bottom Length Measurement */}
          <line x1="95" y1="154" x2="175" y2="154" stroke="#E11D6F" strokeWidth="1.3" />
          <line x1="95" y1="148" x2="95" y2="160" stroke="#E11D6F" strokeWidth="1.3" />
          <line x1="175" y1="148" x2="175" y2="160" stroke="#E11D6F" strokeWidth="1.3" />
          <text
            x="135"
            y="172"
            fill="#831843"
            fontSize="13"
            fontWeight="750"
            textAnchor="middle"
          >
            {dimensions.length}
          </text>
        </svg>
      </div>
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

// Custom Balanced Vector Bike/Scooter Icon
function BikeOptionIcon({ size = 42 }) {
  const iconSize = Math.round(size * 0.57); // 24px when size=42
  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        backgroundColor: '#E8F8EE',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0
      }}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        {/* Wheels */}
        <circle cx="5.5" cy="16.5" r="3" fill="#1E293B" />
        <circle cx="5.5" cy="16.5" r="1.3" fill="#E2E8F0" />
        <circle cx="18.5" cy="16.5" r="3" fill="#1E293B" />
        <circle cx="18.5" cy="16.5" r="1.3" fill="#E2E8F0" />
        {/* Floorboard & Frame */}
        <path d="M5.5 16.5H10.5C11.3 16.5 12 16 12.3 15.2L13.5 11.5H17" stroke="#FF337F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Body & Seat */}
        <path d="M4.5 14C4.5 12.2 6 11 8.5 11H11.5L10.5 14H4.5Z" fill="#FF337F" />
        <path d="M5.5 10.8C5.5 10.8 6.5 9.8 8.5 9.8H11.2C11.8 9.8 12 10.2 11.8 10.8L11.5 11.2H5.5V10.8Z" fill="#334155" />
        {/* Handlebar & Steering */}
        <path d="M18.5 16.5L16.2 8.5L14.8 7H18" stroke="#FF337F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Headlight */}
        <circle cx="17.8" cy="7.2" r="1.2" fill="#F59E0B" />
        {/* Orange Delivery Box behind rider */}
        <rect x="4.8" y="7.5" width="4.8" height="3.5" rx="0.8" fill="#F59E0B" />
        <line x1="4.8" y1="9.2" x2="9.6" y2="9.2" stroke="#D97706" strokeWidth="0.6" />
      </svg>
    </div>
  );
}

// Custom Balanced Vector Car Icon
function CarOptionIcon({ size = 42 }) {
  const iconSize = Math.round(size * 0.57); // 24px when size=42
  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        backgroundColor: '#FFF1F2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0
      }}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <circle cx="6.5" cy="16.5" r="2.8" fill="#1E293B" />
        <circle cx="6.5" cy="16.5" r="1.2" fill="#E2E8F0" />
        <circle cx="17.5" cy="16.5" r="2.8" fill="#1E293B" />
        <circle cx="17.5" cy="16.5" r="1.2" fill="#E2E8F0" />
        <path d="M3.5 14L5.2 9.5C5.5 8.6 6.3 8 7.2 8H16.8C17.7 8 18.5 8.6 18.8 9.5L20.5 14V16H19.5V16C19.5 14.9 18.6 14 17.5 14C16.4 14 15.5 14.9 15.5 16H8.5C8.5 14.9 7.6 14 6.5 14C5.4 14 4.5 14.9 4.5 16H3.5V14Z" fill="#EF4444" />
        <path d="M6 13L7.2 9.5C7.4 9.2 7.7 9 8.1 9H15.9C16.3 9 16.6 9.2 16.8 9.5L18 13H6Z" fill="#BAE6FD" />
        <circle cx="4.5" cy="13.5" r="1" fill="#FEF08A" />
        <circle cx="19.5" cy="13.5" r="1" fill="#FEF08A" />
      </svg>
    </div>
  );
}

// Custom Balanced Vector Package Item Icon
function PackageItemIcon({ size = 42 }) {
  const iconSize = Math.round(size * 0.57); // 24px when size=42
  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        backgroundColor: '#EFFDF5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0
      }}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <path d="M4 8L12 3.5L20 8V16.5L12 21L4 16.5V8Z" fill="#D97706" />
        <path d="M12 3.5L20 8L12 12.5L4 8L12 3.5Z" fill="#F59E0B" />
        <path d="M12 12.5V21L20 16.5V8L12 12.5Z" fill="#B45309" />
        <path d="M10 5.7L14 7.9L12 9L8 6.8L10 5.7Z" fill="#FDE68A" />
        {/* Shipping Label on package */}
        <rect x="6" y="11" width="4" height="3" rx="0.5" fill="#FFFFFF" opacity="0.95" />
        <line x1="6.8" y1="12" x2="9.2" y2="12" stroke="#94A3B8" strokeWidth="0.6" />
        <line x1="6.8" y1="13" x2="8.8" y2="13" stroke="#94A3B8" strokeWidth="0.6" />
      </svg>
    </div>
  );
}

export default function DeliveryDetailsPage({
  pickup,
  dropoff,
  onBack,
  onBook,
  onSwapLocations,
  onUpdateDropoff,
  distanceKm = 4.8
}) {
  // Current active dropoff location state (updated realtime via map pin)
  const [currentDropoff, setCurrentDropoff] = useState(
    dropoff || {
      name: 'Nipah Park (Nipah Mall)',
      address: 'Jl. Urip Sumoharjo No.23C, Panaikang, Panakkukang',
      lat: -5.1357,
      lng: 119.4492
    }
  );

  useEffect(() => {
    if (dropoff) {
      setCurrentDropoff(dropoff);
    }
  }, [dropoff]);

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

  // Item Details (matching reference screenshot)
  const [itemInfo, setItemInfo] = useState({
    itemName: '',
    category: 'Food',
    size: 'S',
    weight: '',
    photo: null,
    weightTier: 'light',
    guarantee: '1 Basic'
  });

  const [tempItem, setTempItem] = useState({ ...itemInfo });
  const [isProhibitedModalOpen, setIsProhibitedModalOpen] = useState(false);

  // Vehicle Option: 'bike' | 'car'
  const [selectedVehicle, setSelectedVehicle] = useState('bike');
  const [isSavedBookmark, setIsSavedBookmark] = useState(false);
  const [isFareExpanded, setIsFareExpanded] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Delivery Speed Option: 'instant' | 'hemat'
  const [deliverySpeed, setDeliverySpeed] = useState('instant');
  const [tempDeliverySpeed, setTempDeliverySpeed] = useState('instant');
  const [isDeliverySpeedModalOpen, setIsDeliverySpeedModalOpen] = useState(false);

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

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  // Format dynamic drop-off time (e.g. Current Time + 35 mins -> "Drop off by 20:16 • Instant")
  const [dropoffEstimateTime, setDropoffEstimateTime] = useState('20:16');
  const [hematEstimateTime, setHematEstimateTime] = useState('22:15');
  useEffect(() => {
    const now = new Date();
    const inst = new Date(now.getTime() + 35 * 60000);
    const hem = new Date(now.getTime() + 140 * 60000);

    setDropoffEstimateTime(
      `${String(inst.getHours()).padStart(2, '0')}:${String(inst.getMinutes()).padStart(2, '0')}`
    );
    setHematEstimateTime(
      `${String(hem.getHours()).padStart(2, '0')}:${String(hem.getMinutes()).padStart(2, '0')}`
    );
  }, []);

  // Accurate distance calculation between pickup and dropoff
  const actualDistance = Math.max(
    1.2,
    pickup?.lat && (currentDropoff?.lat || dropoff?.lat)
      ? calculateHaversineDistance(
          pickup.lat,
          pickup.lng,
          currentDropoff?.lat || dropoff.lat,
          currentDropoff?.lng || dropoff.lng
        )
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

  const baseFare = Math.round(fareResult.totalFare / 100) * 100;

  const finalFare = deliverySpeed === 'hemat'
    ? Math.max(15000, Math.round((baseFare * 0.9) / 100) * 100)
    : baseFare;

  const handleReviewOrderClick = () => {
    // Check if recipient is filled, if not open recipient modal
    if (!recipientInfo.name.trim()) {
      setTempRecipient({ ...recipientInfo });
      setIsRecipientModalOpen(true);
      showToast('⚠️ Silakan lengkapi informasi penerima paket');
      return;
    }
    // Check if item details are filled, if not open item page
    if (!itemInfo.weight) {
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
      const speedLabel = deliverySpeed === 'hemat' ? ' (Hemat)' : '';
      onBook({
        serviceType: 'send',
        ride: {
          id: selectedVehicle === 'car'
            ? (deliverySpeed === 'hemat' ? 'shesend-cargo-hemat' : 'shesend-cargo')
            : (deliverySpeed === 'hemat' ? 'shesend-instant-hemat' : 'shesend-instant'),
          name: selectedVehicle === 'car'
            ? `SheSend Car Cargo${speedLabel}`
            : `SheSend Instant Bike${speedLabel}`,
          price: finalFare
        },
        packageData: {
          itemName: itemInfo.itemName || 'Paket / Makanan',
          category: itemInfo.category,
          weightTier: itemInfo.weightTier,
          deliverySpeed: deliverySpeed === 'hemat' ? 'Instant - Hemat (2-3 jam)' : 'Instant (Maks 1 jam)',
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
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const isInitialMountRef = useRef(false);
  const debounceTimerRef = useRef(null);

  // Draggable sheet state: height as % of viewport
  const SHEET_COLLAPSED = 42;  // % — map is visible
  const SHEET_EXPANDED  = 85;  // % — full form visible
  const [sheetHeightPct, setSheetHeightPct] = useState(SHEET_COLLAPSED);
  const sheetDragRef = useRef({ dragging: false, startY: 0, startPct: SHEET_COLLAPSED });

  // Calculate tip point on map container in pixels
  const getPinTipPoint = () => {
    if (dropoffPinTipRef.current && dropoffMapRef.current) {
      const tipRect = dropoffPinTipRef.current.getBoundingClientRect();
      const mapRect = dropoffMapRef.current.getBoundingClientRect();
      return {
        x: tipRect.left + tipRect.width / 2 - mapRect.left,
        y: tipRect.top + tipRect.height / 2 - mapRect.top
      };
    }
    if (!dropoffMapRef.current) return { x: 0, y: 0 };
    return {
      x: dropoffMapRef.current.clientWidth / 2,
      y: dropoffMapRef.current.clientHeight * 0.35
    };
  };

  // Pan map so given [lat, lng] sits directly under the center pin
  const panToPinLocation = (lat, lng, zoom, animate = true) => {
    if (!dropoffMapInstanceRef.current || !dropoffMapRef.current) return;
    const map = dropoffMapInstanceRef.current;
    const currentZoom = zoom !== undefined ? zoom : map.getZoom();

    const container = dropoffMapRef.current;
    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;

    const tipPoint = getPinTipPoint();
    const diffX = cx - tipPoint.x;
    const diffY = cy - tipPoint.y;

    const targetPixel = map.project([lat, lng], currentZoom);
    const newCenterPixel = targetPixel.add([diffX, diffY]);
    const newCenterLatLng = map.unproject(newCenterPixel, currentZoom);

    if (animate) {
      map.flyTo(newCenterLatLng, currentZoom, {
        duration: 0.5,
        easeLinearity: 0.25
      });
    } else {
      map.setView(newCenterLatLng, currentZoom);
    }
  };

  useEffect(() => {
    if (!isRecipientModalOpen) {
      // Destroy map when view closes to allow clean re-init next time
      if (dropoffMapInstanceRef.current) {
        dropoffMapInstanceRef.current.remove();
        dropoffMapInstanceRef.current = null;
      }
      return;
    }

    const initialLat = currentDropoff?.lat || dropoff?.lat || -5.1357;
    const initialLng = currentDropoff?.lng || dropoff?.lng || 119.4492;

    // Small delay so the DOM node is mounted before Leaflet init
    const timer = setTimeout(() => {
      if (!dropoffMapRef.current || dropoffMapInstanceRef.current) return;

      const map = L.map(dropoffMapRef.current, {
        center: [initialLat, initialLng],
        zoom: 17,
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }).addTo(map);

      isInitialMountRef.current = true;

      // Handle drag & pan movement
      map.on('movestart', () => {
        setIsDropoffMapMoving(true);
        setIsResolvingAddress(true);
      });

      // Realtime debounced address resolving during continuous drag
      map.on('move', () => {
        if (isInitialMountRef.current) return;
        setIsResolvingAddress(true);
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(async () => {
          const tipPoint = getPinTipPoint();
          const latLng = map.containerPointToLatLng([tipPoint.x, tipPoint.y]);
          try {
            const res = await reverseGeocodeNominatim(latLng.lat, latLng.lng);
            const updated = {
              name: res.name || 'Titik Terpilih',
              address: res.subtitle || `${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}`,
              fullAddress: res.displayName || `${res.name}, ${res.subtitle}`,
              lat: latLng.lat,
              lng: latLng.lng
            };
            setCurrentDropoff(updated);
            if (onUpdateDropoff) onUpdateDropoff(updated);
          } catch (e) {
            // Keep previous on temporary error
          } finally {
            setIsResolvingAddress(false);
          }
        }, 220);
      });

      // Instant / fast address resolving on drag release
      map.on('moveend', () => {
        setIsDropoffMapMoving(false);
        if (isInitialMountRef.current) {
          isInitialMountRef.current = false;
          return;
        }

        const tipPoint = getPinTipPoint();
        const latLng = map.containerPointToLatLng([tipPoint.x, tipPoint.y]);

        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(async () => {
          setIsResolvingAddress(true);
          try {
            const res = await reverseGeocodeNominatim(latLng.lat, latLng.lng);
            const updated = {
              name: res.name || 'Titik Terpilih',
              address: res.subtitle || `${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}`,
              fullAddress: res.displayName || `${res.name}, ${res.subtitle}`,
              lat: latLng.lat,
              lng: latLng.lng
            };
            setCurrentDropoff(updated);
            if (onUpdateDropoff) onUpdateDropoff(updated);
          } catch (e) {
            console.error('Reverse geocode error:', e);
          } finally {
            setIsResolvingAddress(false);
          }
        }, 50);
      });

      // Tap anywhere on map to pan pin point to that spot
      map.on('click', (e) => {
        panToPinLocation(e.latlng.lat, e.latlng.lng, undefined, true);
      });

      // Invalidate after render and pan so target coordinate sits directly under the pin tip
      setTimeout(() => {
        if (dropoffMapInstanceRef.current && dropoffMapRef.current) {
          dropoffMapInstanceRef.current.invalidateSize();
          panToPinLocation(initialLat, initialLng, 17, false);
          setTimeout(() => {
            isInitialMountRef.current = false;
          }, 120);
        }
      }, 70);

      dropoffMapInstanceRef.current = map;
    }, 60);

    return () => {
      clearTimeout(timer);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
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
            <CheckCircle2 size={16} color="#FF337F" />
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
              {isResolvingAddress ? (
                <span className="dd-resolving-pill-text">
                  <span className="dd-resolving-spinner-inline" />
                  Mencari lokasi...
                </span>
              ) : (
                currentDropoff?.name || 'Titik Terpilih'
              )}
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
                  {isResolvingAddress ? (
                    <span className="dd-resolving-addr-text">
                      <span className="dd-resolving-spinner-inline dark" />
                      Memuat rincian alamat...
                    </span>
                  ) : (
                    <>
                      <span className="dd-address-card-title">{currentDropoff?.name || 'Titik Terpilih'}</span>
                      {currentDropoff?.address && (
                        <span className="dd-address-card-sub"> • {currentDropoff.address}</span>
                      )}
                    </>
                  )}
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
                if (onUpdateDropoff) {
                  onUpdateDropoff(currentDropoff);
                }
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

  // Render fullscreen Item Details view (matching reference screenshot)
  if (isItemModalOpen) {
    const isConfirmActive = Boolean(tempItem.weight && parseFloat(tempItem.weight) > 0);

    return (
      <div className="dd-item-fullscreen">
        {/* Toast */}
        {toastMessage && (
          <div className="ridego-toast-banner">
            <CheckCircle2 size={16} color="#FF337F" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1. Header Bar */}
        <header className="dd-header-bar">
          <div className="dd-header-left">
            <button
              type="button"
              className="dd-btn-back"
              onClick={() => setIsItemModalOpen(false)}
              aria-label="Kembali"
            >
              <ArrowLeft size={22} color="#111827" strokeWidth={2.4} />
            </button>
            <h1 className="dd-header-title">Item details</h1>
          </div>
        </header>

        {/* 2. Scrollable Body Content */}
        <div className="dd-item-page-body">
          {/* Subtitle */}
          <div className="dd-item-helper-text">
            This helps prepare your driver to handle your item appropriately.
          </div>

          {/* Driver & Box Illustration */}
          <DeliveryDriverBoxIllustration selectedSize={tempItem.size || 'S'} />

          {/* Size & Weight */}
          <div className="dd-item-size-weight-row">
            {/* Size Col */}
            <div className="dd-item-size-col">
              <label className="dd-item-field-label">
                Size<span className="dd-red-star">*</span>
              </label>
              <div className="dd-size-btn-group">
                {['S', 'M', 'L'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`dd-size-circle-pill ${tempItem.size === s ? 'active' : ''}`}
                    onClick={() => setTempItem((prev) => ({ ...prev, size: s }))}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Weight Col */}
            <div className="dd-item-weight-col">
              <label className="dd-item-field-label">
                Weight<span className="dd-red-star">*</span>
              </label>
              <div className="dd-weight-input-wrapper">
                <input
                  type="text"
                  inputMode="decimal"
                  maxLength={5}
                  className="dd-weight-box-input"
                  placeholder=""
                  value={tempItem.weight}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setTempItem((prev) => ({ ...prev, weight: val }));
                  }}
                />
                <span className="dd-weight-kg-label">kg</span>
              </div>
            </div>
          </div>

          {/* Add Photo (Optional) */}
          <div className="dd-item-photo-card">
            <input
              type="file"
              id="dd-item-photo-upload"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setTempItem((p) => ({ ...p, photo: ev.target.result }));
                    showToast('📸 Foto paket berhasil dipilih');
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            {tempItem.photo ? (
              <div className="dd-photo-attached-view">
                <img src={tempItem.photo} alt="Item photo" className="dd-photo-thumb" />
                <div className="dd-photo-text-info">
                  <span className="dd-photo-filename">Foto paket terlampir</span>
                  <button
                    type="button"
                    className="dd-btn-delete-photo"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTempItem((p) => ({ ...p, photo: null }));
                    }}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ) : (
              <label htmlFor="dd-item-photo-upload" className="dd-photo-label-trigger">
                <Camera size={20} color="#004D25" strokeWidth={2.2} />
                <span>Add photo (optional)</span>
              </label>
            )}
          </div>

          {/* Item Type */}
          <div className="dd-item-type-block">
            <div className="dd-item-type-head">
              <span className="dd-item-type-heading">Item type</span>
              <button
                type="button"
                className="dd-prohibited-link"
                onClick={() => setIsProhibitedModalOpen(true)}
              >
                What's prohibited?
              </button>
            </div>

            <div className="dd-item-type-chips-row">
              {[
                { id: 'Document', label: 'Document', icon: <FileText size={16} /> },
                { id: 'Food', label: 'Food', icon: <Utensils size={16} /> },
                { id: 'Clothing', label: 'Clothing', icon: <Shirt size={16} /> },
                { id: 'Electronic', label: 'Electronic', icon: <Laptop size={16} /> },
                { id: 'Other', label: 'Other', icon: <Package size={16} /> }
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`dd-category-pill-btn ${tempItem.category === cat.id ? 'active' : ''}`}
                  onClick={() =>
                    setTempItem((prev) => ({
                      ...prev,
                      category: cat.id,
                      itemName: prev.itemName ? prev.itemName : cat.label
                    }))
                  }
                >
                  <span>{cat.label}</span>
                  {cat.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Item Description (Optional helper) */}
          <div className="dd-form-group" style={{ marginTop: 4 }}>
            <label className="dd-item-field-label">Detail / Nama Barang</label>
            <input
              type="text"
              maxLength={120}
              className="dd-input-text dd-rounded-input"
              placeholder="e.g. Makanan kotak, dokumen berkas, pakaian..."
              value={tempItem.itemName}
              onChange={(e) => setTempItem((prev) => ({ ...prev, itemName: e.target.value }))}
            />
          </div>
        </div>

        {/* 3. Bottom Confirm Footer */}
        <div className="dd-item-footer-sheet">
          <button
            type="button"
            className={`dd-item-btn-confirm ${isConfirmActive ? 'active' : 'disabled'}`}
            onClick={() => {
              if (!isConfirmActive) {
                showToast('⚠️ Silakan masukkan berat paket (kg)');
                return;
              }
              const finalItem = {
                ...tempItem,
                itemName: tempItem.itemName.trim() || tempItem.category || 'Paket Barang',
                weightTier: parseFloat(tempItem.weight) > 5 ? 'heavy' : parseFloat(tempItem.weight) > 2 ? 'medium' : 'light'
              };
              setItemInfo(finalItem);
              setIsItemModalOpen(false);
              showToast('✅ Rincian barang berhasil disimpan');
            }}
          >
            Confirm
          </button>
        </div>

        {/* Prohibited items bottom sheet modal */}
        {isProhibitedModalOpen && (
          <div
            className="dd-modal-overlay"
            onClick={() => setIsProhibitedModalOpen(false)}
          >
            <div
              className="dd-modal-sheet"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="dd-modal-header">
                <div className="dd-modal-title-wrap">
                  <AlertCircle size={20} color="#EF4444" />
                  <h3 className="dd-modal-title">Prohibited Items</h3>
                </div>
                <button
                  type="button"
                  className="dd-btn-close-modal"
                  onClick={() => setIsProhibitedModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="dd-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 13.5, color: '#4B5563', lineHeight: 1.45 }}>
                  Untuk keselamatan pengemudi dan kepatuhan hukum, barang-barang berikut dilarang untuk dikirim:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5, color: '#111827' }}>
                  <div>🔥 <strong>Zat Berbahaya & Mudah Terbakar:</strong> Bensin, gas, petasan, kembang api.</div>
                  <div>⚔️ <strong>Senjata:</strong> Senjata tajam, senjata api, amunisi.</div>
                  <div>💰 <strong>Barang Berharga:</strong> Uang tunai, perhiasan emas, surat berharga.</div>
                  <div>🐾 <strong>Makhluk Hidup:</strong> Hewan peliharaan atau satwa liar.</div>
                  <div>🚫 <strong>Narkoba & Obat Terlarang:</strong> Narkotika dan zat adiktif.</div>
                </div>
              </div>

              <div className="dd-modal-footer">
                <button
                  type="button"
                  className="dd-btn-save-modal"
                  style={{ background: '#FF337F' }}
                  onClick={() => setIsProhibitedModalOpen(false)}
                >
                  Saya Mengerti
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="dd-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="ridego-toast-banner">
          <CheckCircle2 size={16} color="#FF337F" />
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
                  {currentDropoff?.name || dropoff?.name || 'Mall Ratu Indah'}
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
            onClick={() => {
              setTempDeliverySpeed(deliverySpeed);
              setIsDeliverySpeedModalOpen(true);
            }}
          >
            <div className="dd-row-left">
              {deliverySpeed === 'hemat' ? (
                <DeliveryHematIcon size={42} />
              ) : (
                <DeliveryInstantIcon size={42} />
              )}
              <div className="dd-row-text">
                <div className="dd-row-title">
                  {deliverySpeed === 'hemat'
                    ? 'Pick up now (Hemat • 2-3 hrs)'
                    : 'Pick up now (30 min or less)'}
                </div>
                <div className="dd-row-sub">
                  {deliverySpeed === 'hemat'
                    ? `Drop off by ${hematEstimateTime} • Instant - Hemat`
                    : `Drop off by ${dropoffEstimateTime} • Instant`}
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
              {selectedVehicle === 'car' ? (
                <CarOptionIcon size={42} />
              ) : (
                <BikeOptionIcon size={42} />
              )}
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
              <PackageItemIcon size={42} />
              <div className="dd-row-text">
                <div className="dd-row-title">
                  {itemInfo.weight ? (
                    <span className="dd-filled-item-name">{itemInfo.itemName || itemInfo.category} ({itemInfo.weight} kg)</span>
                  ) : itemInfo.itemName ? (
                    <span className="dd-filled-item-name">{itemInfo.itemName}</span>
                  ) : (
                    <span className="dd-add-item-prompt">
                      Add item details <span className="dd-required-star">*</span>
                    </span>
                  )}
                </div>
                <div className="dd-row-sub">
                  {itemInfo.weight
                    ? `Size ${itemInfo.size || 'S'} • ${itemInfo.category || 'Food'}`
                    : `Delivery Guarantee • ${itemInfo.guarantee}`}
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
              color="#FF337F"
              fill={isSavedBookmark ? '#FF337F' : 'none'}
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
                  <BikeOptionIcon size={42} />
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
                  <CarOptionIcon size={42} />
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
                <ShieldCheck size={20} color="#FF337F" />
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

      {/* Modal 4: How'd you like it delivered? (matching reference screenshot) */}
      {isDeliverySpeedModalOpen && (
        <div
          className="dd-modal-overlay"
          onClick={() => setIsDeliverySpeedModalOpen(false)}
        >
          <div
            className="dd-delivery-speed-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dd-speed-title">
              How'd you like it delivered?
            </div>

            <div className="dd-speed-options-list">
              {/* Option 1: Instant */}
              <div
                className={`dd-speed-card ${tempDeliverySpeed === 'instant' ? 'selected' : ''}`}
                onClick={() => setTempDeliverySpeed('instant')}
              >
                <div className="dd-speed-icon-wrapper">
                  <DeliveryInstantIcon size={46} />
                </div>
                <div className="dd-speed-text-col">
                  <div className="dd-speed-row-top">
                    <span className="dd-speed-name">Instant</span>
                    <span className="dd-speed-price">Rp{baseFare.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="dd-speed-desc">
                    Picked up immediately, arrives within 1 hour
                  </div>
                </div>
              </div>

              {/* Option 2: Instant - Hemat */}
              <div
                className={`dd-speed-card ${tempDeliverySpeed === 'hemat' ? 'selected' : ''}`}
                onClick={() => setTempDeliverySpeed('hemat')}
              >
                <div className="dd-speed-icon-wrapper">
                  <DeliveryHematIcon size={46} />
                </div>
                <div className="dd-speed-text-col">
                  <div className="dd-speed-row-top">
                    <span className="dd-speed-name">Instant - Hemat</span>
                    <span className="dd-speed-price">Rp{Math.max(15000, Math.round((baseFare * 0.9) / 100) * 100).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="dd-speed-desc">
                    Arrives in 2–3 hours. Efficient routes, saves fuel
                  </div>
                </div>
              </div>

              {/* Option 3: Same Day */}
              <div
                className="dd-speed-card disabled"
                onClick={() => showToast('⚠️ Layanan Same Day belum tersedia untuk rute ini')}
              >
                <div className="dd-speed-icon-wrapper">
                  <DeliverySameDayIcon size={46} />
                </div>
                <div className="dd-speed-text-col">
                  <div className="dd-speed-row-top">
                    <span className="dd-speed-name muted">Same Day</span>
                    <span className="dd-speed-price muted">-</span>
                  </div>
                  <div className="dd-speed-desc text-danger">
                    Unavailable in selected location.
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="dd-speed-footer">
              <button
                type="button"
                className="dd-btn-calendar"
                onClick={() => showToast('📅 Pengiriman terjadwal dapat disesuaikan pada opsi waktu')}
                aria-label="Jadwalkan pengiriman"
              >
                <Calendar size={22} color="#005A30" />
              </button>
              <button
                type="button"
                className="dd-btn-next"
                onClick={() => {
                  setDeliverySpeed(tempDeliverySpeed);
                  setIsDeliverySpeedModalOpen(false);
                  showToast(
                    tempDeliverySpeed === 'hemat'
                      ? '⚡ Opsi dipilih: Instant - Hemat (Arrives in 2-3 hours)'
                      : '⚡ Opsi dipilih: Instant (Picked up immediately)'
                  );
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
