import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  ArrowUpDown,
  CheckCircle2,
  MapPin
} from 'lucide-react';
import sherideHeroArt from '../assets/sheride_hero_pink.png';
import { POPULAR_LOCATIONS } from '../data/popularLocations.js';
import { searchNominatim } from '../utils/geoUtils.js';

// Pixel-perfect Red Location Pin with white center hole
function RedLocationPin({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M12 2C7.58 2 4 5.58 4 10C4 15.5 11.25 21.6 11.56 21.86C11.69 21.96 11.84 22 12 22C12.16 22 12.31 21.96 12.44 21.86C12.75 21.6 20 15.5 20 10C20 5.58 16.42 2 12 2Z"
        fill="#EE4335"
      />
      <circle cx="12" cy="9.8" r="3.2" fill="#FFFFFF" />
    </svg>
  );
}

// Green Destination Ring (matching reference Image 2)
function GreenDestinationRing({ size = 18 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '3.5px solid #00B14F',
        backgroundColor: '#FFFFFF',
        boxSizing: 'border-box',
        flexShrink: 0
      }}
    />
  );
}

// Green Folded Map Icon (matching reference Image 2 "Select on map")
function GreenFoldedMapIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#00B14F"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  );
}

// Purple Plus Circle Icon (matching reference Image 2 "Add destination")
function PurplePlusCircleIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" fill="#4E4CE6" />
      <path d="M12 7.5V16.5M7.5 12H16.5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

const RECENT_SEARCH_LOCATIONS = [
  {
    id: 'rec-anditonro',
    name: 'Jalan Andi Tonro',
    address: 'Jl. Andi Tonro, Bonto-Bontoa, Somba Opu, Gowa',
    lat: -5.2045,
    lng: 119.4550
  },
  {
    id: 'rec-indomode',
    name: 'Indo Mode Tamalate',
    address: 'Jl. Sultan Alauddin, Mangasa, Tamalate, Kota Makassar',
    lat: -5.1843,
    lng: 119.4182
  },
  {
    id: 'rec-home',
    name: 'Home',
    address: 'B/14, Graha Sejahtera Residence, Perumahan Graha Sejahtera Blok B No. 14, Somba Opu, Gowa',
    lat: -5.2012,
    lng: 119.4589
  },
  {
    id: 'rec-ahass',
    name: 'Honda Ahass Pandang Pandang Workshop',
    address: 'Jl. Andi Mallom Bassane, Pandang Pandang, Somba Opu, Gowa, Sulawesi Selatan',
    lat: -5.2078,
    lng: 119.4512
  },
  {
    id: 'rec-indomode',
    name: 'Indo Mode Tamalate',
    address: 'Jl. Sultan Alauddin, Mangasa, Tamalate, Kota Makassar',
    lat: -5.1843,
    lng: 119.4182
  },
  {
    id: 'rec-bhayangkara',
    name: 'Bhayangkara Makassar Hospital',
    address: 'Jl. A. Mappaoddang, Jongaya, Tamalate, Kota Makassar',
    lat: -5.1711,
    lng: 119.4132
  },
  {
    id: 'rec-uin',
    name: 'UIN Alauddin Kampus 2 Samata',
    address: 'Jl. H.M. Yasin Limpo, Somba Opu, Gowa',
    lat: -5.2052,
    lng: 119.4930
  },
  {
    id: 'rec-mp',
    name: 'Mall Panakkukang (MP)',
    address: 'Jl. Boulevard, Panakkukang, Kota Makassar',
    lat: -5.1568,
    lng: 119.4475
  },
  {
    id: 'rec-bandara',
    name: 'Bandara Internasional Sultan Hasanuddin',
    address: 'Jl. Bandara Baru, Mandai, Maros',
    lat: -5.0617,
    lng: 119.5539
  },
  {
    id: 'rec-galesong',
    name: 'Wisata Pantai Bintang Galesong',
    address: 'Desa Boddia, Galesong, Kabupaten Takalar',
    lat: -5.3180,
    lng: 119.3620
  }
];

export default function WhereToPage({
  onBack,
  onOpenMap,
  onSelectDestination,
  onSelectPickup,
  selectedVehicleType = 'bike',
  timeMode = 'now',
  userLocation = 'Current location'
}) {
  const [pickupQuery, setPickupQuery] = useState(userLocation || 'Indo Mode Tamalate');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeField, setActiveField] = useState('destination');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const destinationInputRef = useRef(null);
  const pickupInputRef = useRef(null);
  const debounceRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Reusable real-time search function for both pickup and destination
  const performSearch = (val) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val || val.trim().length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (val.trim().length >= 2) {
      setIsSearching(true);
      debounceRef.current = setTimeout(async () => {
        const smartResults = await searchNominatim(val);
        setSearchResults(smartResults || []);
        setIsSearching(false);
      }, 200);
    } else {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    performSearch(val);
  };

  const handlePickupChange = (val) => {
    setPickupQuery(val);
    if (onSelectPickup) {
      onSelectPickup({
        name: val,
        address: val
      });
    }
    performSearch(val);
  };

  const handleSwapLocations = () => {
    const tempPickup = pickupQuery;
    const tempDest = searchQuery;
    setPickupQuery(tempDest || 'Current location');
    setSearchQuery(tempPickup === 'Current location' ? '' : tempPickup);
    showToast('🔄 Titik jemput dan tujuan berhasil ditukar');
  };

  const handleSelectLocation = (loc) => {
    if (activeField === 'pickup') {
      setPickupQuery(loc.name);
      if (onSelectPickup) {
        onSelectPickup(loc);
      }
      showToast(`📍 Titik jemput dipilih: ${loc.name}`);
      setActiveField('destination');
      destinationInputRef.current?.focus();
    } else {
      setSearchQuery(loc.name);
      showToast(`📍 Tujuan dipilih: ${loc.name}`);
      onSelectDestination(loc, {
        vehicleType: selectedVehicleType,
        timeMode,
        pickupText: pickupQuery
      });
    }
  };

  const handleAddDestination = () => {
    setActiveField('destination');
    destinationInputRef.current?.focus();
    destinationInputRef.current?.select();
  };

  const isPackageMode = selectedVehicleType === 'express';

  return (
    <div className="whereto-ref2-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="ridego-toast-banner">
          <CheckCircle2 size={16} color="#00B14F" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner with SheRide Pink Illustration */}
      <div className="whereto-ref2-header">
        <img
          src={sherideHeroArt}
          alt="SheRide Fleet"
          className="whereto-ref2-header-bg"
        />
        <div className="whereto-ref2-header-overlay" />

        <div className="whereto-ref2-nav-row">
          <button
            type="button"
            className="whereto-ref2-back-btn"
            onClick={onBack}
            aria-label="Kembali"
          >
            <ArrowLeft size={19} color="#1F2937" strokeWidth={2.4} />
          </button>
          <h1 className="whereto-ref2-title">
            {isPackageMode ? 'Where to send the package?' : 'Where do you want to go?'}
          </h1>
        </div>
      </div>

      {/* Main Content Sheet */}
      <div className="whereto-ref2-sheet">
        <div className="whereto-ref2-subtitle">
          {isPackageMode ? 'Enter pickup and delivery points' : 'Enter your destination'}
        </div>

        {/* Route Input Card */}
        <div className="whereto-ref2-route-card">
          <div className="whereto-ref2-route-body">
            {/* Left Icons with Dotted Connector (Bulat di atas, Pin point di bawah) */}
            <div className="whereto-ref2-route-indicators">
              <GreenDestinationRing size={16} />
              <div className="whereto-ref2-route-dash" />
              <RedLocationPin size={18} />
            </div>

            {/* Inputs */}
            <div className="whereto-ref2-route-inputs">
              <div className="whereto-ref2-input-row">
                <input
                  ref={pickupInputRef}
                  type="text"
                  className="whereto-ref2-input"
                  value={pickupQuery}
                  onChange={(e) => handlePickupChange(e.target.value)}
                  onFocus={() => {
                    setActiveField('pickup');
                    if (pickupQuery === 'Current location') {
                      setPickupQuery('');
                      setSearchResults([]);
                    }
                  }}
                  onClick={() => {
                    setActiveField('pickup');
                    if (pickupQuery === 'Current location') {
                      setPickupQuery('');
                      setSearchResults([]);
                    }
                  }}
                  onBlur={() => {
                    if (!pickupQuery || !pickupQuery.trim()) {
                      setPickupQuery('Current location');
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && pickupQuery.trim()) {
                      if (onSelectPickup) {
                        onSelectPickup({
                          id: 'custom-pickup',
                          name: pickupQuery,
                          address: pickupQuery
                        });
                      }
                      destinationInputRef.current?.focus();
                    }
                  }}
                  placeholder={isPackageMode ? 'Pick up item at?' : 'Pick up at?'}
                  aria-label="Pickup Location"
                />
              </div>

              <div className="whereto-ref2-route-divider" />

              <div className="whereto-ref2-input-row">
                <input
                  ref={destinationInputRef}
                  type="text"
                  className="whereto-ref2-input"
                  value={searchQuery}
                  onFocus={() => setActiveField('destination')}
                  onClick={() => setActiveField('destination')}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      handleSelectLocation({
                        id: 'custom-dest',
                        name: searchQuery,
                        address: searchQuery,
                        lat: -5.1711,
                        lng: 119.4132
                      });
                    }
                  }}
                  placeholder={isPackageMode ? 'Deliver to?' : 'Where to?'}
                  aria-label="Destination Location"
                />
              </div>
            </div>
          </div>

          {/* Swap Button on Right */}
          <button
            type="button"
            className="whereto-ref2-swap-btn"
            onClick={handleSwapLocations}
            title="Tukar titik jemput dan tujuan"
            aria-label="Swap locations"
          >
            <ArrowUpDown size={14} color="#6366F1" />
          </button>
        </div>

        {/* Action Buttons: Select on map & Add destination */}
        <div className="whereto-ref2-actions">
          <button
            type="button"
            className="whereto-ref2-action-btn"
            onClick={onOpenMap}
          >
            <GreenFoldedMapIcon size={16} />
            <span>Select on map</span>
          </button>

          <button
            type="button"
            className="whereto-ref2-action-btn"
            onClick={handleAddDestination}
          >
            <PurplePlusCircleIcon size={18} />
            <span>Add destination</span>
          </button>
        </div>

        {/* Riwayat Pencarian Lokasi Terbaru */}
        <div className="whereto-ref2-suggestions">
          {(searchResults.length > 0 ? searchResults : RECENT_SEARCH_LOCATIONS).map((loc) => (
            <div
              key={loc.id}
              className="whereto-ref2-suggest-item"
              onClick={() => handleSelectLocation(loc)}
            >
              <div className="whereto-history-pin-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C7.58 2 4 5.58 4 10C4 15.5 11.25 21.6 11.56 21.86C11.69 21.96 11.84 22 12 22C12.16 22 12.31 21.96 12.44 21.86C12.75 21.6 20 15.5 20 10C20 5.58 16.42 2 12 2Z"
                    stroke="#FFFFFF"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="10" r="2.8" stroke="#FFFFFF" strokeWidth="1.9" />
                </svg>
              </div>
              <div className="whereto-ref2-suggest-details">
                <div className="whereto-ref2-suggest-name">{loc.name}</div>
                <div className="whereto-ref2-suggest-address">{loc.address}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
