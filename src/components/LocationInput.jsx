import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, ArrowUpDown, Search, Bookmark, X, Loader2 } from 'lucide-react';
import { POPULAR_LOCATIONS } from '../data/popularLocations.js';
import { searchNominatim } from '../utils/geoUtils.js';

export default function LocationInput({
  pickup,
  setPickup,
  dropoff,
  setDropoff,
  onSwapLocations,
  onActivatePinMode,
  activePinMode
}) {
  const [pickupQuery, setPickupQuery] = useState(pickup?.name || '');
  const [dropoffQuery, setDropoffQuery] = useState(dropoff?.name || '');
  const [activeInput, setActiveInput] = useState(null); // 'pickup' | 'dropoff' | null
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef(null);

  // Sync internal queries when external location changes
  const prevPickupName = useRef(pickup?.name);
  const prevDropoffName = useRef(dropoff?.name);

  useEffect(() => {
    if (pickup?.name && pickup.name !== prevPickupName.current) {
      prevPickupName.current = pickup.name;
      setPickupQuery(pickup.name);
    }
  }, [pickup?.name]);

  useEffect(() => {
    if (dropoff?.name && dropoff.name !== prevDropoffName.current) {
      prevDropoffName.current = dropoff.name;
      setDropoffQuery(dropoff.name);
    }
  }, [dropoff?.name]);

  // Handle Nominatim search debounced
  const handleQueryChange = (type, value) => {
    if (type === 'pickup') setPickupQuery(value);
    else setDropoffQuery(value);

    setActiveInput(type);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (value.trim().length >= 2) {
      setIsSearching(true);
      debounceTimerRef.current = setTimeout(async () => {
        const results = await searchNominatim(value);
        setSearchResults(results || []);
        setIsSearching(false);
      }, 200);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleSelectPlace = (place) => {
    const locObj = {
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng
    };

    if (activeInput === 'pickup') {
      setPickup(locObj);
      setPickupQuery(place.name);
    } else {
      setDropoff(locObj);
      setDropoffQuery(place.name);
    }

    setActiveInput(null);
    setSearchResults([]);
  };

  return (
    <div className="location-input-card">
      <div className="input-fields-container">
        {/* Connecting Line Indicator */}
        <div className="location-route-indicator">
          <div className="dot-circle pickup-dot" />
          <div className="dashed-line" />
          <div className="dot-circle dropoff-dot" />
        </div>

        {/* Inputs */}
        <div className="inputs-wrapper">
          {/* Pickup Field */}
          <div className="input-row">
            <div className="input-inner">
              <input
                type="text"
                className="location-text-input"
                placeholder="Tentukan lokasi jemput..."
                value={pickupQuery}
                onChange={(e) => handleQueryChange('pickup', e.target.value)}
                onFocus={() => setActiveInput('pickup')}
              />
              {pickupQuery && (
                <button
                  className="btn-clear-input"
                  onClick={() => {
                    setPickupQuery('');
                    setPickup(null);
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              className={`btn-pin-map ${activePinMode === 'pickup' ? 'active' : ''}`}
              onClick={() => onActivatePinMode('pickup')}
              title="Pilih titik jemput langsung di peta"
            >
              <MapPin size={16} />
              <span className="btn-pin-text">Peta</span>
            </button>
          </div>

          {/* Destination Field */}
          <div className="input-row">
            <div className="input-inner">
              <input
                type="text"
                className="location-text-input"
                placeholder="Mau diantar ke mana?"
                value={dropoffQuery}
                onChange={(e) => handleQueryChange('dropoff', e.target.value)}
                onFocus={() => setActiveInput('dropoff')}
              />
              {dropoffQuery && (
                <button
                  className="btn-clear-input"
                  onClick={() => {
                    setDropoffQuery('');
                    setDropoff(null);
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              className={`btn-pin-map ${activePinMode === 'dropoff' ? 'active' : ''}`}
              onClick={() => onActivatePinMode('dropoff')}
              title="Pilih titik tujuan langsung di peta"
            >
              <MapPin size={16} />
              <span className="btn-pin-text">Peta</span>
            </button>
          </div>
        </div>

        {/* Swap Button */}
        <button className="btn-swap-locations" onClick={onSwapLocations} title="Tukar titik jemput & tujuan">
          <ArrowUpDown size={16} />
        </button>
      </div>

      {/* Autocomplete / Popular Suggestions Dropdown */}
      {activeInput && (
        <div className="suggestions-dropdown">
          <div className="suggestions-header">
            <span>{isSearching ? 'Mencari alamat...' : 'Pilih Lokasi Cepat:'}</span>
            <button className="btn-close-dropdown" onClick={() => setActiveInput(null)}>
              Tutup
            </button>
          </div>

          {isSearching && (
            <div className="search-loading">
              <Loader2 size={16} className="spin-icon" />
              <span>Menghubungi OpenStreetMap...</span>
            </div>
          )}

          {searchResults.length > 0 ? (
            <div className="results-list">
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  className="suggestion-item"
                  onClick={() => handleSelectPlace(item)}
                >
                  <Search size={16} className="item-icon" />
                  <div className="item-details">
                    <div className="item-name">{item.name}</div>
                    <div className="item-address">{item.address}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="popular-list">
              {POPULAR_LOCATIONS.map((loc) => (
                <div
                  key={loc.id}
                  className="suggestion-item"
                  onClick={() => handleSelectPlace(loc)}
                >
                  <Bookmark size={15} className="item-icon bookmark-icon" />
                  <div className="item-details">
                    <div className="item-name">{loc.name}</div>
                    <div className="item-address">{loc.category} · {loc.address}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        .location-input-card {
          position: relative;
          background: #F8F7FA;
          border-radius: var(--radius-lg);
          padding: 12px;
          border: 1px solid var(--border-neutral);
          margin-bottom: 16px;
        }

        .input-fields-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .location-route-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 6px 0;
          gap: 4px;
        }

        .dot-circle {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .pickup-dot {
          background: #E15B88;
          box-shadow: 0 0 0 3px rgba(225, 91, 136, 0.2);
        }

        .dropoff-dot {
          background: #8C68CD;
          box-shadow: 0 0 0 3px rgba(140, 104, 205, 0.2);
        }

        .dashed-line {
          width: 2px;
          height: 32px;
          background: repeating-linear-gradient(
            to bottom,
            #D0CBD9,
            #D0CBD9 4px,
            transparent 4px,
            transparent 8px
          );
        }

        .inputs-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .input-inner {
          flex: 1;
          background: white;
          border: 1px solid var(--border-neutral);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          padding: 2px 8px;
          transition: var(--transition);
        }

        .input-inner:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px var(--primary-light);
        }

        .location-text-input {
          width: 100%;
          border: none;
          outline: none;
          padding: 8px 4px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-main);
          background: transparent;
        }

        .btn-clear-input {
          border: none;
          background: transparent;
          color: var(--text-light);
          cursor: pointer;
          display: flex;
          padding: 2px;
        }

        .btn-pin-map {
          border: 1px solid var(--border-subtle);
          background: white;
          color: var(--text-muted);
          border-radius: var(--radius-sm);
          padding: 7px 10px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: var(--transition);
          flex-shrink: 0;
        }

        .btn-pin-map:hover {
          background: var(--primary-light);
          color: var(--primary);
          border-color: var(--primary);
        }

        .btn-pin-map.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .btn-swap-locations {
          background: white;
          border: 1px solid var(--border-neutral);
          color: var(--text-muted);
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition);
          flex-shrink: 0;
        }

        .btn-swap-locations:hover {
          color: var(--primary);
          border-color: var(--primary);
          transform: rotate(180deg);
        }

        .suggestions-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border-subtle);
          margin-top: 6px;
          z-index: 1050;
          max-height: 260px;
          overflow-y: auto;
          padding: 8px;
        }

        .suggestions-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 8px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border-neutral);
        }

        .btn-close-dropdown {
          border: none;
          background: transparent;
          color: var(--primary);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .suggestion-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 8px 10px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: var(--transition);
        }

        .suggestion-item:hover {
          background: var(--primary-light);
        }

        .item-icon {
          color: var(--text-light);
          margin-top: 2px;
          flex-shrink: 0;
        }

        .bookmark-icon {
          color: var(--secondary);
        }

        .item-details {
          flex: 1;
        }

        .item-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main);
        }

        .item-address {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.3;
        }

        .search-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px;
          color: var(--text-muted);
          font-size: 12px;
        }

        .spin-icon {
          animation: spin 1s linear infinite;
          color: var(--primary);
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
