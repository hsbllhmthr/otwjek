import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  ArrowUpDown,
  CheckCircle2,
  Package
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

// Purple Plus Circle Icon
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

const RECENT_PACKAGE_LOCATIONS = [
  {
    id: 'pkg-loc-mari',
    name: 'Mall Ratu Indah',
    address: 'Jl. DR. Ratulangi No.35, Mamajang, Kota Makassar',
    lat: -5.1558,
    lng: 119.4168
  },
  {
    id: 'pkg-loc-1',
    name: 'Jalan Andi Tonro',
    address: 'Jl. Andi Tonro, Bonto-Bontoa, Somba Opu, Gowa',
    lat: -5.2045,
    lng: 119.4550
  },
  {
    id: 'pkg-loc-2',
    name: 'Indo Mode Tamalate',
    address: 'Jl. Sultan Alauddin, Mangasa, Tamalate, Kota Makassar',
    lat: -5.1843,
    lng: 119.4182
  },
  {
    id: 'pkg-loc-3',
    name: 'Mall Panakkukang (MP)',
    address: 'Jl. Boulevard, Panakkukang, Kota Makassar',
    lat: -5.1568,
    lng: 119.4475
  },
  {
    id: 'pkg-loc-4',
    name: 'UIN Alauddin Kampus 2 Samata',
    address: 'Jl. H.M. Yasin Limpo, Somba Opu, Gowa',
    lat: -5.2052,
    lng: 119.4930
  }
];

export default function SendPackagePage({
  onBack,
  onOpenMap,
  onSelectDestination,
  onSelectPickup,
  timeMode = 'now',
  userLocation = 'Current location'
}) {
  const [pickupQuery, setPickupQuery] = useState(
    userLocation && userLocation !== 'Current location'
      ? userLocation
      : 'B/15, Graha Sejahtera Residence'
  );
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
    showToast('🔄 Titik ambil barang dan titik antar berhasil ditukar');
  };

  const handleSelectLocation = (loc) => {
    if (activeField === 'pickup') {
      setPickupQuery(loc.name);
      if (onSelectPickup) {
        onSelectPickup(loc);
      }
      showToast(`📍 Lokasi pengambilan paket: ${loc.name}`);
      setActiveField('destination');
      destinationInputRef.current?.focus();
    } else {
      setSearchQuery(loc.name);
      showToast(`📦 Lokasi pengantaran paket: ${loc.name}`);
      onSelectDestination(loc, {
        vehicleType: 'express',
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
          alt="SheSend Fleet"
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
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 className="whereto-ref2-title" style={{ fontSize: 19 }}>Where to send the package?</h1>
          </div>
        </div>
      </div>

      {/* Main Content Sheet */}
      <div className="whereto-ref2-sheet">
        <div className="whereto-ref2-subtitle">Enter pickup and delivery points</div>

        {/* Route Input Card */}
        <div className="whereto-ref2-route-card">
          <div className="whereto-ref2-route-body">
            {/* Left Icons with Dotted Connector (Bulat di atas, Pin point di bawah) */}
            <div className="whereto-ref2-route-indicators">
              <GreenDestinationRing size={16} />
              <div className="whereto-ref2-route-dash" />
              <RedLocationPin size={18} />
            </div>

            {/* Inputs: Pick up item at? and Deliver to? */}
            <div className="whereto-ref2-route-inputs">
              {/* Kolom 1: Pick up item at? */}
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
                  placeholder="Pick up item at?"
                  aria-label="Pick up item at"
                />
              </div>

              <div className="whereto-ref2-route-divider" />

              {/* Kolom 2: Deliver to? */}
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
                  placeholder="Deliver to?"
                  aria-label="Deliver to"
                />
              </div>
            </div>
          </div>

          {/* Swap Button on Right */}
          <button
            type="button"
            className="whereto-ref2-swap-btn"
            onClick={handleSwapLocations}
            title="Tukar titik ambil barang dan titik antar"
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

        {/* Riwayat / Rekomendasi Lokasi Pengantaran Paket */}
        <div className="whereto-ref2-suggestions">
          {(searchResults.length > 0 ? searchResults : RECENT_PACKAGE_LOCATIONS).map((loc) => (
            <div
              key={loc.id}
              className="whereto-ref2-suggest-item"
              onClick={() => handleSelectLocation(loc)}
            >
              <div className="whereto-history-pin-icon" style={{ background: '#00B14F' }}>
                <Package size={17} color="#FFFFFF" />
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
